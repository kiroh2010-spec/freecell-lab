# Supabase setup for Freecell Lab

## Project

- URL: `https://zhhvyvjbqdwurwlgseod.supabase.co`
- Frontend key type: publishable key (`sb_publishable_...`)

## Setup steps

1. Open Supabase project `freecell-lab`.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the full contents of `supabase/schema.sql`.
5. Run it once.

Do **not** expose or paste the `sb_secret_...` key anywhere in the frontend.

## What the SQL creates

- `players`
  - player id
  - 4-digit PIN
  - clears
  - difficulty progress
  - one-time edit flag
- `weekly_scores`
  - weekly score entries
  - time/moves/hint/difficulty/mode
- RPC functions
  - `freecell_register_player`
  - `freecell_update_player_once`
  - `freecell_submit_score`
  - `freecell_weekly_leaderboard`

## Frontend behavior

- On load, auto-generated player is registered to Supabase.
- On clear, score is submitted to Supabase.
- Ranking panel fetches server weekly leaderboard.
- While playing, the client refreshes server ranking every 30 seconds.
- It can notify when #1 changes or when the current pace is within 500 points of #1.
