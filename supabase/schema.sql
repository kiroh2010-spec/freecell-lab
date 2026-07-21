-- Freecell Lab Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.players (
  player_id text primary key,
  pin text not null check (pin ~ '^[0-9]{4}$'),
  clears integer not null default 0,
  difficulty_index integer not null default 0,
  edit_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_scores (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  week_key text not null,
  score integer not null,
  elapsed_time integer not null,
  moves integer not null,
  hint_used integer not null default 0,
  difficulty_code text not null default 'e1',
  mode text not null default 'normal',
  created_at timestamptz not null default now()
);

create index if not exists weekly_scores_week_score_idx
  on public.weekly_scores (week_key, score desc, elapsed_time asc, moves asc);

alter table public.players enable row level security;
alter table public.weekly_scores enable row level security;

drop policy if exists "weekly_scores_select_public" on public.weekly_scores;
create policy "weekly_scores_select_public"
  on public.weekly_scores
  for select
  to anon, authenticated
  using (true);

-- Players are accessed only through security definer RPC functions.

drop function if exists public.freecell_difficulty_index(text);
create function public.freecell_difficulty_index(p_code text)
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

drop function if exists public.freecell_register_player(text, text);
create function public.freecell_register_player(p_player_id text, p_pin text)
returns table(status text, player_id text, clears integer, difficulty_index integer, edit_used boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_player_id is null or length(trim(p_player_id)) < 3 then
    return query select 'invalid_id'::text, null::text, 0, 0, false;
    return;
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return query select 'invalid_pin'::text, null::text, 0, 0, false;
    return;
  end if;

  if exists(select 1 from players p where p.player_id = upper(trim(p_player_id)) and p.pin <> p_pin) then
    return query select 'id_taken'::text, upper(trim(p_player_id)), 0, 0, false;
    return;
  end if;

  insert into players(player_id, pin)
  values (upper(trim(p_player_id)), p_pin)
  on conflict (player_id) do update
    set updated_at = now()
    where players.pin = excluded.pin;

  return query
  select 'ok'::text, p.player_id, p.clears, p.difficulty_index, p.edit_used
  from players p
  where p.player_id = upper(trim(p_player_id)) and p.pin = p_pin;
end;
$$;

drop function if exists public.freecell_update_player_once(text, text, text, text);
create function public.freecell_update_player_once(p_old_id text, p_old_pin text, p_new_id text, p_new_pin text)
returns table(status text, player_id text, clears integer, difficulty_index integer, edit_used boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  old_player players%rowtype;
  target_player players%rowtype;
begin
  select * into old_player from players where player_id = upper(trim(p_old_id)) and pin = p_old_pin;
  if not found then
    return query select 'invalid_current'::text, null::text, 0, 0, false;
    return;
  end if;
  if old_player.edit_used then
    return query select 'edit_used'::text, old_player.player_id, old_player.clears, old_player.difficulty_index, old_player.edit_used;
    return;
  end if;
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4}$' then
    return query select 'invalid_pin'::text, old_player.player_id, old_player.clears, old_player.difficulty_index, old_player.edit_used;
    return;
  end if;

  select * into target_player from players where player_id = upper(trim(p_new_id));
  if found and target_player.pin <> p_new_pin then
    return query select 'id_taken'::text, target_player.player_id, 0, 0, false;
    return;
  end if;

  if found and target_player.pin = p_new_pin then
    update players set edit_used = true, updated_at = now() where player_id = target_player.player_id;
    return query select 'ok'::text, target_player.player_id, target_player.clears, target_player.difficulty_index, true;
    return;
  end if;

  update weekly_scores set player_id = upper(trim(p_new_id)) where player_id = old_player.player_id;
  update players
    set player_id = upper(trim(p_new_id)), pin = p_new_pin, edit_used = true, updated_at = now()
    where player_id = old_player.player_id;

  return query
  select 'ok'::text, p.player_id, p.clears, p.difficulty_index, p.edit_used
  from players p
  where p.player_id = upper(trim(p_new_id));
end;
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
begin
  if not exists(select 1 from players where player_id = p_player_id and pin = p_pin) then
    return query select 'invalid_player'::text, null::integer;
    return;
  end if;

  insert into weekly_scores(player_id, week_key, score, elapsed_time, moves, hint_used, difficulty_code, mode)
  values (p_player_id, p_week_key, p_score, p_time, p_moves, coalesce(p_hint_used, 0), p_difficulty_code, coalesce(p_mode, 'normal'))
  returning id into inserted_id;

  new_index := public.freecell_difficulty_index(p_difficulty_code);
  update players
    set clears = clears + 1,
        difficulty_index = greatest(difficulty_index, case when p_mode = 'promotion' then new_index else difficulty_index end),
        updated_at = now()
    where player_id = p_player_id;

  return query
  select 'ok'::text, ranked.rank::integer
  from (
    select id, row_number() over (order by score desc, elapsed_time asc, moves asc) as rank
    from weekly_scores
    where week_key = p_week_key
  ) ranked
  where ranked.id = inserted_id;
end;
$$;

drop function if exists public.freecell_weekly_leaderboard(text, integer);
create function public.freecell_weekly_leaderboard(p_week_key text, p_limit integer default 20)
returns table(
  player_id text,
  score integer,
  elapsed_time integer,
  moves integer,
  hint_used integer,
  difficulty_code text,
  mode text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select player_id, score, elapsed_time, moves, hint_used, difficulty_code, mode, created_at
  from weekly_scores
  where week_key = p_week_key
  order by score desc, elapsed_time asc, moves asc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
