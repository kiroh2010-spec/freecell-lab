-- Freecell Lab completed-play logging migration.
-- Run in Supabase SQL Editor after the base schema is installed.

create table if not exists public.play_logs (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  week_key text not null,
  score integer not null,
  elapsed_time integer not null,
  moves integer not null,
  hint_used integer not null default 0,
  difficulty_code text not null default 'e1',
  mode text not null default 'normal',
  result text not null default 'cleared',
  created_at timestamptz not null default now()
);

create index if not exists play_logs_created_at_idx
  on public.play_logs (created_at desc);
create index if not exists play_logs_week_player_idx
  on public.play_logs (week_key, player_id, created_at desc);

alter table public.play_logs enable row level security;

drop policy if exists "play_logs_select_public" on public.play_logs;
create policy "play_logs_select_public"
  on public.play_logs
  for select
  to anon, authenticated
  using (true);

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

  update public.players
  set clears = clears + 1,
      difficulty_index = greatest(
        difficulty_index,
        case when p_mode = 'promotion' then public.freecell_difficulty_index(p_difficulty_code) else difficulty_index end
      ),
      updated_at = now()
  where public.players.player_id = p_player_id;

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
