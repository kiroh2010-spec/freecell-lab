-- Freecell Lab: harden one-time ID/PIN change.
-- Blocks switching into an already existing player ID even when the PIN matches.
-- Allows one-time update of the same account's PIN, or rename to a brand-new ID.

create or replace function public.freecell_update_player_once(
  p_old_id text,
  p_old_pin text,
  p_new_id text,
  p_new_pin text
)
returns table(status text, out_player_id text, clears integer, difficulty_index integer, edit_used boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  old_player public.players%rowtype;
  target_player public.players%rowtype;
  normalized_new_id text;
begin
  normalized_new_id := upper(trim(coalesce(p_new_id, '')));

  select *
  into old_player
  from public.players
  where public.players.player_id = upper(trim(p_old_id))
    and public.players.pin = p_old_pin;

  if not found then
    return query select 'invalid_current'::text, null::text, 0, 0, false;
    return;
  end if;

  if old_player.edit_used then
    return query
    select 'edit_used'::text,
           old_player.player_id,
           old_player.clears,
           old_player.difficulty_index,
           old_player.edit_used;
    return;
  end if;

  if length(normalized_new_id) < 3 then
    return query
    select 'invalid_id'::text,
           old_player.player_id,
           old_player.clears,
           old_player.difficulty_index,
           old_player.edit_used;
    return;
  end if;

  if p_new_pin is null or p_new_pin !~ '^[0-9]{4}$' then
    return query
    select 'invalid_pin'::text,
           old_player.player_id,
           old_player.clears,
           old_player.difficulty_index,
           old_player.edit_used;
    return;
  end if;

  -- Same account: allow using the single edit to change PIN and/or normalize ID casing.
  if normalized_new_id = old_player.player_id then
    update public.players
    set pin = p_new_pin,
        edit_used = true,
        updated_at = now()
    where public.players.player_id = old_player.player_id;

    return query
    select 'ok'::text,
           p.player_id,
           p.clears,
           p.difficulty_index,
           p.edit_used
    from public.players p
    where p.player_id = old_player.player_id;
    return;
  end if;

  select *
  into target_player
  from public.players
  where public.players.player_id = normalized_new_id;

  -- Existing IDs are never a valid rename target. This closes the "fresh account -> existing ID with same PIN" bypass.
  if found then
    return query select 'id_taken'::text, target_player.player_id, 0, 0, target_player.edit_used;
    return;
  end if;

  update public.weekly_scores
  set player_id = normalized_new_id
  where public.weekly_scores.player_id = old_player.player_id;

  -- play_logs exists in production; keep history aligned when present.
  update public.play_logs
  set player_id = normalized_new_id
  where public.play_logs.player_id = old_player.player_id;

  update public.players
  set player_id = normalized_new_id,
      pin = p_new_pin,
      edit_used = true,
      updated_at = now()
  where public.players.player_id = old_player.player_id;

  return query
  select 'ok'::text,
         p.player_id,
         p.clears,
         p.difficulty_index,
         p.edit_used
  from public.players p
  where p.player_id = normalized_new_id;
end;
$$;
