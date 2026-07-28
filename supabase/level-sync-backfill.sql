-- Freecell Lab 1LV normalization migration.
-- Purpose:
-- 1) Reset every stored account level to 1LV (difficulty_index = 0).
-- 2) Reinstall freecell_submit_score so future records stay e1/normal and never award level bonuses.
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.freecell_difficulty_index(p_code text)
returns integer
language sql
immutable
as $$
  select 0;
$$;

-- Reset every account to 1LV.
update public.players
set difficulty_index = 0,
    updated_at = now()
where difficulty_index <> 0;

-- Normalize stored ranking/log labels to 1LV.
update public.weekly_scores
set difficulty_code = 'e1',
    mode = 'normal'
where difficulty_code <> 'e1' or mode <> 'normal';

update public.play_logs
set difficulty_code = 'e1',
    mode = 'normal'
where difficulty_code <> 'e1' or mode <> 'normal';

-- Recalculate existing stored scores with the 1LV reform formula, removing old level multipliers/bonuses.
update public.weekly_scores
set score = round(greatest(
  100::numeric,
  2000
  + (case when coalesce(elapsed_time, 0) <= 300 then greatest(0::numeric, 1000 - coalesce(elapsed_time, 0) * 3) else greatest(0::numeric, 100 - (coalesce(elapsed_time, 0) - 300) / 3.0) end) * 1.5
  + (case when coalesce(moves, 0) <= 120 then greatest(0::numeric, 900 - coalesce(moves, 0) * 7) else greatest(0::numeric, 60 - (coalesce(moves, 0) - 120) * 0.75) end) * 1.5
  - coalesce(hint_used, 0) * 40
))::integer;

update public.play_logs
set score = round(greatest(
  100::numeric,
  2000
  + (case when coalesce(elapsed_time, 0) <= 300 then greatest(0::numeric, 1000 - coalesce(elapsed_time, 0) * 3) else greatest(0::numeric, 100 - (coalesce(elapsed_time, 0) - 300) / 3.0) end) * 1.5
  + (case when coalesce(moves, 0) <= 120 then greatest(0::numeric, 900 - coalesce(moves, 0) * 7) else greatest(0::numeric, 60 - (coalesce(moves, 0) - 120) * 0.75) end) * 1.5
  - coalesce(hint_used, 0) * 40
))::integer;

-- Future-proof: submitted scores are stored as 1LV/normal and never raise players.difficulty_index.
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
  normalized_score integer;
begin

  normalized_score := round(greatest(
    100::numeric,
    2000
    + (
      case
        when coalesce(p_time, 0) <= 300 then greatest(0::numeric, 1000 - coalesce(p_time, 0) * 3)
        else greatest(0::numeric, 100 - (coalesce(p_time, 0) - 300) / 3.0)
      end
    ) * 1.5
    + (
      case
        when coalesce(p_moves, 0) <= 120 then greatest(0::numeric, 900 - coalesce(p_moves, 0) * 7)
        else greatest(0::numeric, 60 - (coalesce(p_moves, 0) - 120) * 0.75)
      end
    ) * 1.5
    - coalesce(p_hint_used, 0) * 40
  ))::integer;
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
    normalized_score,
    p_time,
    p_moves,
    coalesce(p_hint_used, 0),
    'e1',
    'normal',
    'cleared'
  );

  update public.players
  set clears = clears + 1,
      difficulty_index = 0,
      updated_at = now()
  where public.players.player_id = p_player_id;

  select max(score)
  into best_score
  from public.weekly_scores
  where public.weekly_scores.player_id = p_player_id
    and public.weekly_scores.week_key = p_week_key;

  if best_score is not null and normalized_score <= best_score then
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
    normalized_score,
    p_time,
    p_moves,
    coalesce(p_hint_used, 0),
    'e1',
    'normal'
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

-- Optional verification queries after the migration:
-- select count(*) as non_1lv_players from public.players where difficulty_index <> 0;
-- select count(*) as non_1lv_weekly_scores from public.weekly_scores where difficulty_code <> 'e1' or mode <> 'normal';
-- select count(*) as non_1lv_play_logs from public.play_logs where difficulty_code <> 'e1' or mode <> 'normal';
