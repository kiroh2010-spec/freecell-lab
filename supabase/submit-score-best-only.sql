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

  update public.players
  set clears = clears + 1,
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
