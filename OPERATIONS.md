# Freecell Operations Checklist

This project has live users and persistent data. Treat account, DB, ranking, scoring, and balance changes as operations work, not just frontend work.

## Source of Truth

Before changing anything that affects users, explicitly identify the source of truth.

- Account identity / edit rights: `players.player_id`, `players.pin`, `players.edit_used`
- Account progression / level: `players.difficulty_index`
- Current client session: `localStorage freecell.currentGame.v1`
- Local account cache: `localStorage freecell.player.v1`, `freecell.stats.v1`, `freecell.profiles.v1`
- Weekly ranking display: `weekly_scores` by `week_key`
- Score formula generation: client `calculateScore()` and server `freecell_calculate_score()` / `freecell_submit_score()` payload

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
- Archived formulas such as old 10000-point scoring or reform `scoreV2` must be labeled `지금은 쓰지 않음` and must not be reachable from runtime UI or ranking code.
- If changing score display, verify result modal, local ranking, server ranking, submit score, and shortage messages together.

## Balance Changes

- Difficulty/deal generation changes affect user trust even if no DB schema changes.
- Keep balance changes in dev/alpha first unless explicitly approved for beta.
- For beta balance changes, include a short rollback plan.

## Alpha / Beta Promotion Rules

- Dev-only tools must never ship to alpha or beta.
  - This includes cheats, test buttons, fake result/ranking simulators, autoplay helpers, forced clear/promotion tools, and seeded/dev-only data.
  - Public builds must remove them from both UI and JavaScript code, not just hide them.
  - Before any alpha-or-higher deployment, run `scripts/build-pages.sh` and grep the public artifacts for dev-only markers such as test button IDs, test function names, and Korean labels like `테스트` when relevant.
- Alpha and beta use the same version number for the same release candidate.
  - Example: test `알파 v0.15`; if stable, promote it as `베타 v0.15`.
- Alpha is where specs may be added, removed, or revised during testing.
  - If a spec is risky or unstable, remove/fix it in alpha and retest before beta.
  - Do not patch beta directly with a new or different spec during promotion.
- Beta is a promotion of the stable alpha candidate, not a separate feature branch.
  - Allowed beta-only differences: channel label, public path, cache-buster prefix, `channel`, `buildId`, and release-note wording that describes the same accepted specs.
  - Not allowed beta-only differences: game logic, score formula, ranking behavior, DB/RPC behavior, account flow, or UI behavior.
- Before beta deployment, compare alpha and beta build artifacts.
  - HTML/CSS/JS must match after normalizing labels, patch notes, cache strings, and channel metadata.
  - If unexpected differences exist, stop deployment and rebuild/retest the alpha candidate.
- A beta deployment is not complete until the public URL shows the expected beta label/version and the promoted behavior is verified.

## Operator Notice Rules

- Operator notices are operator-authored content, not assistant-authored release notes.
- Only reflect notice text that the operator explicitly wrote and saved.
- Do not invent, rewrite, summarize, embellish, or publish notice wording under the operator's name.
- If deployment needs release notes, use `VERSION.json` patch notes instead of changing `NOTICE.json` unless the operator provides exact notice text.
- Before deploying notice changes, verify the diff against the operator-saved source and confirm no assistant-generated notice wording is being introduced.

## Red Flags

Pause and inspect before deploying if any of these are true:

- A localStorage value can disagree with server data.
- A weekly reset changes whether a fallback still works.
- A server RPC can update one table but not another related table.
- Existing user rows need a new invariant.
- A feature works only because current ranking rows still exist.
- The client mutates local identity before server confirmation.
- `NOTICE.json` or public notice files contain wording the operator did not directly write and save.
