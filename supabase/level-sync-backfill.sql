-- Freecell Lab level sync/backfill migration.
-- Purpose:
-- 1) Backfill players.difficulty_index from historical promotion ranking records.
-- 2) Reinstall freecell_submit_score so future promotion clears always update player level
--    before weekly best-score filtering.
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.freecell_difficulty_index(p_code text)
returns integer
language sql
immutable
as $$
  select case p_code
    when 'e1' then 0
    when 'e2' then 1
    when 'n1' then 2
    when 'n2' then 3
    when 'n3' then 4
    else 0
  end;
$$;

-- Backfill account level from every recorded promotion clear, not just the current week.
-- This is what makes users remain correct after the Monday ranking key changes.
with promoted_levels as (
  select
    player_id,
    max(public.freecell_difficulty_index(difficulty_code)) as difficulty_index
  from public.weekly_scores
  where mode = 'promotion'
  group by player_id
), updated as (
  update public.players p
  set difficulty_index = greatest(p.difficulty_index, promoted_levels.difficulty_index),
      updated_at = now()
  from promoted_levels
  where p.player_id = promoted_levels.player_id
    and promoted_levels.difficulty_index > p.difficulty_index
  returning p.player_id, p.difficulty_index
)
select * from updated order by player_id;

-- Future-proof: promotion clears must update players.difficulty_index even when the score
-- is not a weekly personal best and therefore does not replace weekly_scores.
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
begin
  if not exists (
    select 1
    from public.players
    where public.players.player_id = p_player_id
      and public.players.pin = p_pin
  ) then
    return query select 'invalid_player'::text, null::integer;
    return;
  end if;

  delete from public.play_logs
  where public.play_logs.created_at < now() - interval '7 days';

  insert into public.play_logs(
    player_id,
    week_key,
    score,
    elapsed_time,
    moves,
    hint_used,
    difficulty_code,
    mode,
    result
  )
  values (
    p_player_id,
    p_week_key,
    p_score,
    p_time,
    p_moves,
    coalesce(p_hint_used, 0),
    p_difficulty_code,
    coalesce(p_mode, 'normal'),
    'cleared'
  );

  new_index := public.freecell_difficulty_index(p_difficulty_code);
  update public.players
  set clears = clears + 1,
      difficulty_index = greatest(
        difficulty_index,
        case when coalesce(p_mode, 'normal') = 'promotion' then new_index else difficulty_index end
      ),
      updated_at = now()
  where public.players.player_id = p_player_id;

  select max(score)
  into best_score
  from public.weekly_scores
  where public.weekly_scores.player_id = p_player_id
    and public.weekly_scores.week_key = p_week_key;

  if best_score is not null and p_score <= best_score then
    return query
    select 'not_best'::text, ranked.rank::integer
    from (
      select player_id,
             row_number() over (order by score desc, elapsed_time asc, moves asc) as rank
      from public.weekly_scores
      where week_key = p_week_key
    ) ranked
    where ranked.player_id = p_player_id;
    return;
  end if;

  delete from public.weekly_scores
  where public.weekly_scores.player_id = p_player_id
    and public.weekly_scores.week_key = p_week_key;

  insert into public.weekly_scores(
    player_id,
    week_key,
    score,
    elapsed_time,
    moves,
    hint_used,
    difficulty_code,
    mode
  )
  values (
    p_player_id,
    p_week_key,
    p_score,
    p_time,
    p_moves,
    coalesce(p_hint_used, 0),
    p_difficulty_code,
    coalesce(p_mode, 'normal')
  )
  returning id into inserted_id;

  return query
  select 'ok'::text, r.rank::integer
  from (
    select id,
           row_number() over (order by score desc, elapsed_time asc, moves asc) as rank
    from public.weekly_scores
    where week_key = p_week_key
  ) r
  where r.id = inserted_id;
end;
$$;

-- Optional verification query after the migration:
-- select p.player_id, p.difficulty_index, promoted_levels.difficulty_index as ranking_level
-- from public.players p
-- join (
--   select player_id, max(public.freecell_difficulty_index(difficulty_code)) as difficulty_index
--   from public.weekly_scores
--   where mode = 'promotion'
--   group by player_id
-- ) promoted_levels using (player_id)
-- where p.difficulty_index < promoted_levels.difficulty_index
-- order by p.player_id;
