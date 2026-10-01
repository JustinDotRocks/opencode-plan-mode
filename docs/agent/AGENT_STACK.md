# Agent stack — who loads what

| Surface | Role | Loads |
| --- | --- | --- |
| OpenCode 2 Desktop/CLI | Interactive plan/build | Repo `AGENTS.md` (short always-on) + docs below; `/plan` when gated; Ponytail on implement |
| KanDev → Cursor ACP | Board cards (IP / Review) | Same repo `AGENTS.md` + docs; profile `custom_prompt` restates priorities; Review stays commit-by-Justin |
| KanDev → OpenCode profile | Alternate board agent | Same; prefer server `plugins` / `AGENTS.md`, not `cli.json` |
| Ponytail | Minimal code bias | After plan approved / during implement only — not a substitute for SECURITY |
| Scaffold CLI (future) | New repo bootstrap | Copies global pack + empty project overlays |

## Always-on vs depth
- **Always-on (short):** `AGENTS.md` — priority order + GATED_WORK scan before coding; points at SECURITY / SCOPE.
- **On demand:** ARCHITECTURE + ADRs, GATED_WORK, TASK_TEMPLATE, HOTFIX, KANDEV_MAP — pull when the task needs them.

## Priority order (every agent, every turn)
1. Security  
2. Scope (no unrelated logic)  
3. Architecture (existing seams)  
4. Surgical change / everything else

## Layout (proposed)
- **Global pack** (one place Justin maintains): SECURITY, SCOPE, GATED_WORK, HOTFIX, TASK_TEMPLATE, KANDEV_MAP, AGENT_STACK, AGENTS.md template
- **Per project:** ARCHITECTURE + ADRs, stack notes, Verify commands — scaffold CLI copies global + empty overlays
