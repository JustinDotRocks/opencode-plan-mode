# Project overlay — OpenCode Plan Mode

Project-specific lines moved from `docs/agent`. Do not weaken SECURITY or SCOPE.

## Staging / branches
- GitHub **`default_branch` stays `main`**. That is release / major-feature promotion, not the agent PR base. Optional: protect `main` so only Justin can promote.
- Day-to-day feature work lands on **`dev`** (staging).

## Quiet create
Agent titles off → chevron → **Create** without starting an agent. CLI fallback: `kd-quiet`.

## Verify example
```sh
# replace with project commands
npm test
```

## KanDev-config / no-PR example
details on the T-5 settings card

## Agent stack rows
| Surface | Role | Loads |
| --- | --- | --- |
| OpenCode 2 Desktop/CLI | Interactive plan/build | Repo `AGENTS.md` (short always-on) + docs below; `/plan` on a manual Backlog kick when gated; Ponytail on implement |
| KanDev → OpenCode profile | Alternate board agent | Same; prefer server `plugins` / `AGENTS.md`, not `cli.json` |
| Ponytail | Minimal code bias | After plan approved / during implement only — not a substitute for SECURITY |
