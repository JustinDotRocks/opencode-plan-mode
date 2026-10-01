# Task template (KanDev In Progress / OpenCode)

Copy into the card prompt or session. Keep short. Fill every section.

## Goal
One sentence: what ships when this is done.

## In scope
- Concrete outcomes / files / packages allowed to change

## Out of scope
- Temptations the agent must **suggest only**, not implement

## Security notes
Auth / secrets / trust boundaries / network / new deps — or `N/A` + why.

## Architecture
Which module/ADR to follow. No new layer unless justified in one line.

## Blast radius
Max paths/packages that may change. Prefer the smallest set.

## Plan first? (scan GATED_WORK before coding)
- [ ] No — no triggers / HOTFIX applies (see HOTFIX.md)
- [ ] Yes — GATED_WORK trigger matched; produce plan only, wait for Justin approve

## Verify (Done when)
Commands/behaviors that must pass before commit/PR, e.g.:
```sh
# replace with project commands
npm test
```

## Hand-off
After verify: commit + draft PR (Summary / Business / Technical / Test plan). Stay on this card’s branch. Do not auto-merge. Do not resolve Review findings for Justin.
