# Freecell Operations Checklist

This project has live users and persistent data. Treat account, DB, ranking, scoring, and balance changes as operations work, not just frontend work.

## Source of Truth

Before changing anything that affects users, explicitly identify the source of truth.

- Account identity / edit rights: `players.player_id`, `players.pin`, `players.edit_used`
- Account progression / level: `players.difficulty_index`
- Current client session: `localStorage freecell.currentGame.v1`
- Local account cache: `localStorage freecell.player.v1`, `freecell.stats.v1`, `freecell.profiles.v1`
- Weekly ranking display: `weekly_scores` by `week_key`
- Score formula generation: client `calculateScore()` / `calculateReformScore()` and submit payload

If two sources can disagree, define reconciliation rules before deployment.

## Required Before Deploying Data-Affecting Changes

For any change touching account management, DB schema/RPC, ranking, score, level, difficulty, balance, or weekly reset:

1. Write down the intended behavior.
2. Identify all affected data fields and localStorage keys.
3. Check old data compatibility.
4. Decide whether a DB migration/backfill is required.
5. Add or update the Supabase SQL migration file.
6. Verify server RPC behavior directly in SQL Editor or via REST/RPC.
7. Verify client behavior only after server behavior is correct.
8. Confirm dev / alpha / beta deployment scope before pushing.
9. After deployment, verify:
   - raw GitHub files
   - public Pages VERSION
   - DB query result
   - one realistic user scenario
10. Record what changed in workspace memory.

## Account Management Rules

- ID/PIN change is one-time per server account.
- Existing IDs are never valid rename targets, even if PIN matches.
- Server must reject invalid identity changes; client local state must only change after server `ok`.
- Never rely on client-side `editUsed` alone.
- When testing identity flows, test both:
  - `edit_used=true -> new ID` should return `edit_used`
  - `fresh/edit_available -> existing ID` should return `id_taken`

## Ranking / Score / Level Rules

- Ranking display is not the same as account progression.
- Account level should come from `players.difficulty_index`.
- Promotion records can be used for backfill, but weekly ranking reset must not erase account progression.
- Score formula changes require either:
  - a new score version/week key, or
  - a full migration/backfill plan.
- If changing score display, verify result modal, local ranking, server ranking, submit score, and shortage messages together.

## Balance Changes

- Difficulty/deal generation changes affect user trust even if no DB schema changes.
- Keep balance changes in dev/alpha first unless explicitly approved for beta.
- For beta balance changes, include a short rollback plan.

## Red Flags

Pause and inspect before deploying if any of these are true:

- A localStorage value can disagree with server data.
- A weekly reset changes whether a fallback still works.
- A server RPC can update one table but not another related table.
- Existing user rows need a new invariant.
- A feature works only because current ranking rows still exist.
- The client mutates local identity before server confirmation.
