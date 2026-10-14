Shared pack: edit in agent-guardrails, not here.
# Agent stack — who loads what

| Surface | Role | Loads |
| --- | --- | --- |
| KanDev → Cursor ACP | Board cards (Backlog plan kick / Ready / IP / Review) | Same repo `AGENTS.md` + docs; profile `custom_prompt` restates priorities. Board rules (gated kick, PR base: see KANDEV_MAP Stacking, columns) live in `GATED_WORK.md` / `KANDEV_MAP.md` / KanDev — not in `AGENTS.md`. |
| Scaffold CLI (future) | New repo bootstrap | Copies global pack + empty project overlays |

See `docs/project/PROJECT.md`.

## Always-on vs depth
- **Always-on (short):** `AGENTS.md` — priority (SECURITY → SCOPE → ARCHITECTURE → everything else); Delivery: stick to the approved plan as written (do not reinterpret, rewrite, or expand); always load SECURITY / SCOPE. Board rules (gated kick, PR base: see KANDEV_MAP Stacking, columns) live in `GATED_WORK.md` / `KANDEV_MAP.md` / KanDev — not in `AGENTS.md`.
- **On demand:** ARCHITECTURE + ADRs, GATED_WORK, TASK_TEMPLATE, HOTFIX, KANDEV_MAP — pull when the task needs them.

## Priority order (every agent, every turn)
1. Security  
2. Scope (no unrelated logic)  
3. Architecture (existing seams)  
4. Surgical change / everything else

## Layout
- **`docs/agent`** = shared pack (subtree from `JustinDotRocks/agent-guardrails`; edit only there)
- **`docs/project` + `AGENTS.md`** = project-owned overlay
