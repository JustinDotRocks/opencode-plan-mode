# Agent stack — who loads what

| Surface | Role | Loads |
| --- | --- | --- |
| OpenCode 2 Desktop/CLI | Interactive plan/build | Repo `AGENTS.md` (short always-on) + docs below; `/plan` on a manual Backlog kick when gated; Ponytail on implement |
| KanDev → Cursor ACP | Board cards (Backlog plan kick / Ready / IP / Review) | Same repo `AGENTS.md` + docs; profile `custom_prompt` restates priorities. Board rules (gated kick, draft PR base `dev`, columns) live in `GATED_WORK.md` / `KANDEV_MAP.md` / KanDev — not in `AGENTS.md`. |
| KanDev → OpenCode profile | Alternate board agent | Same; prefer server `plugins` / `AGENTS.md`, not `cli.json` |
| Ponytail | Minimal code bias | After plan approved / during implement only — not a substitute for SECURITY |
| Scaffold CLI (future) | New repo bootstrap | Copies global pack + empty project overlays |

## Always-on vs depth
- **Always-on (short):** `AGENTS.md` — priority (SECURITY → SCOPE → ARCHITECTURE → everything else); Delivery: stick to the approved plan as written (do not reinterpret, rewrite, or expand); always load SECURITY / SCOPE. Board rules (gated kick, draft PR base `dev`, columns) live in `GATED_WORK.md` / `KANDEV_MAP.md` / KanDev — not in `AGENTS.md`.
- **On demand:** ARCHITECTURE + ADRs, GATED_WORK, TASK_TEMPLATE, HOTFIX, KANDEV_MAP — pull when the task needs them.

## Priority order (every agent, every turn)
1. Security  
2. Scope (no unrelated logic)  
3. Architecture (existing seams)  
4. Surgical change / everything else

## Layout (proposed)
- **Global pack** (one place the maintainer keeps): SECURITY, SCOPE, GATED_WORK, HOTFIX, TASK_TEMPLATE, KANDEV_MAP, AGENT_STACK, AGENTS.md template
- **Per project:** ARCHITECTURE + ADRs, stack notes, Verify commands — scaffold CLI copies global + empty overlays
