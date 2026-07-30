-- Freecell Lab time-weighted current ranking score.
-- Aligns server-side freecell_submit_score with the dev/client current score formula.
-- Formula:
--   time_score = max(1500 for alpha mode, otherwise 300, 4000 - max(0, elapsed_seconds - 120) * 5)
--   move_bonus = clamp(140 - moves, 0, 100)
--   score = max(100, time_score + move_bonus - hint_used * 100 - special_penalty) * multiplier
-- Server submissions do not include special-skill clears today because the client skips server submit when special is used.

create or replace function public.freecell_score_multiplier(p_difficulty_code text, p_mode text default 'normal')
returns numeric
language sql
immutable
as $$
  select case coalesce(p_difficulty_code, 'e1')
    when 'e2' then 1.08
    when 'n1' then 1.20
    else 1.00
  end
  + case when coalesce(p_mode, 'normal') = 'promotion' then 0.10 else 0 end;
$$;

create or replace function public.freecell_calculate_score(
  p_time integer,
  p_moves integer,
  p_hint_used integer default 0,
  p_difficulty_code text default 'e1',
  p_mode text default 'normal'
)
returns integer
language sql
immutable
as $$
  with normalized as (
    select
      greatest(0, coalesce(p_time, 0))::integer as elapsed_seconds,
      greatest(0, coalesce(p_moves, 0))::integer as moves,
      greatest(0, coalesce(p_hint_used, 0))::integer as hint_used,
      coalesce(p_mode, 'normal') as mode,
      public.freecell_score_multiplier(p_difficulty_code, p_mode) as multiplier
  ), score_parts as (
    select
      greatest(case when mode = 'alpha' then 1500 else 300 end, 4000 - greatest(0, elapsed_seconds - 120) * 5) as time_score,
      least(100, greatest(0, 140 - moves)) as move_bonus,
      hint_used * 100 as undo_penalty,
      multiplier
    from normalized
  )
  select round(greatest(100, time_score + move_bonus - undo_penalty) * multiplier)::integer
  from score_parts;
$$;

drop function if exists public.freecell_submit_score(text, text, text, integer, integer, integer, integer, text, text);
create function public.freecell_submit_score(
  p_player_id text,
  p_pin text,
  p_week_key text,
  p_score integer,
  p_time integer,
  p_moves integer,
  p_hint_used integer,
  p_difficulty_code text,
  p_mode text
)
returns table(status text, rank integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  new_index integer;
  best_score integer;
  server_score integer;
begin
  if not exists(select 1 from public.players where player_id = p_player_id and pin = p_pin) then
    return query select 'invalid_player'::text, null::integer;
    return;
  end if;

  server_score := public.freecell_calculate_score(
    p_time,
    p_moves,
    coalesce(p_hint_used, 0),
    p_difficulty_code,
    coalesce(p_mode, 'normal')
  );

  delete from public.play_logs
  where created_at < now() - interval '7 days';

  insert into public.play_logs(player_id, week_key, score, elapsed_time, moves, hint_used, difficulty_code, mode, result)
  values (p_player_id, p_week_key, server_score, p_time, p_moves, coalesce(p_hint_used, 0), p_difficulty_code, coalesce(p_mode, 'normal'), 'cleared');

  new_index := public.freecell_difficulty_index(p_difficulty_code);
  update public.players
    set clears = clears + 1,
        difficulty_index = greatest(difficulty_index, case when p_mode = 'promotion' then new_index else difficulty_index end),
        updated_at = now()
    where player_id = p_player_id;

  select max(score)
  into best_score
  from public.weekly_scores
  where player_id = p_player_id
    and week_key = p_week_key;

  if best_score is not null and server_score <= best_score then
    return query
    select 'not_best'::text, ranked.rank::integer
    from (
      select weekly_scores.player_id,
             row_number() over (order by score desc, elapsed_time asc, moves asc) as rank
      from public.weekly_scores
      where week_key = p_week_key
    ) ranked
    where ranked.player_id = p_player_id;
    return;
  end if;

  delete from public.weekly_scores
  where weekly_scores.player_id = p_player_id
    and weekly_scores.week_key = p_week_key;

  insert into public.weekly_scores(player_id, week_key, score, elapsed_time, moves, hint_used, difficulty_code, mode)
  values (p_player_id, p_week_key, server_score, p_time, p_moves, coalesce(p_hint_used, 0), p_difficulty_code, coalesce(p_mode, 'normal'))
  returning id into inserted_id;

  return query
  select 'ok'::text, ranked.rank::integer
  from (
    select id, row_number() over (order by score desc, elapsed_time asc, moves asc) as rank
    from public.weekly_scores
    where week_key = p_week_key
  ) ranked
  where ranked.id = inserted_id;
end;
$$;

-- Optional one-time repair for existing rows in the current stored tables.
-- Uncomment and run only if you want old stored DB scores recalculated immediately.
-- update public.play_logs
-- set score = public.freecell_calculate_score(elapsed_time, moves, hint_used, difficulty_code, mode)
-- where week_key = '2026-07-27';
--
-- update public.weekly_scores
-- set score = public.freecell_calculate_score(elapsed_time, moves, hint_used, difficulty_code, mode)
-- where week_key = '2026-07-27';
