Shared pack: edit in agent-guardrails, not here.
# Task template (KanDev In Progress / OpenCode)

Copy into the card prompt or session. Keep short. Fill every section.

## Goal
One sentence: what ships when this is done.

## Depends on
`Depends on: T-N` (Justin fills in at card creation only if stacking; leave out otherwise).

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

## Plan first? (manual Backlog kick — not at IP start)
- [ ] No — no triggers / HOTFIX applies; no plan kick. Justin moves to **Ready** (the gate). See HOTFIX.md.
- [ ] Yes — GATED_WORK matched. Backlog kick: plan only, await Justin approve, move to **Ready**. Cannot enter IP until Ready. Do not auto-pull from Backlog.

## Verify (Done when)
Commands/behaviors that must pass before commit/PR.
See `docs/project/PROJECT.md`.

## Hand-off
After verify: commit + draft PR. No `Depends on` → PR to `dev`. Parent merged → merge `origin/dev`, PR to `dev`. Parent open → merge the parent branch (no rebase, no force-push), PR against that branch, PR body starts `Stacked on #N. Merge after it.` Parent has no PR → skip and `step_complete` with BLOCKED. Parent PR closed unmerged, or parent BLOCKED (its card shows BLOCKED) → `step_complete` with BLOCKED and don't code. Before opening the PR, check the parent again. If it merged during the run, merge `origin/dev` and PR to `dev`. Never open or merge to `main` unless Justin is promoting a major feature. `main` is release / major-feature promotion only (GitHub default stays `main`). Summary / Business / Technical / Test plan. Stay on this card’s branch. Do not auto-merge. Do not resolve Review findings for Justin. Send-to-agent stays in Review on this PR branch.

**Exception:** KanDev-config / no-PR cards skip commit + draft PR (see `docs/project/PROJECT.md`).
