# AGENTS.md — always-on (keep short)

## Priority (conflicts)
1. **SECURITY** — never trade away (`docs/agent/SECURITY.md`)
2. **SCOPE** — no unrelated logic (`docs/agent/SCOPE.md`)
3. **ARCHITECTURE** — prefer existing seams / ADRs
4. Everything else (speed, niceties, drive-bys)

## Delivery
Stick to the approved plan as written. Do not reinterpret, rewrite, or expand it. If it's unclear or blocked, stop and ask Justin. Surgical diffs only.

## Load
Always: this file + SECURITY + SCOPE. When needed: `docs/agent/ARCHITECTURE.md`, `GATED_WORK.md`, `HOTFIX.md`, `KANDEV_MAP.md`, `TASK_TEMPLATE.md`, `AGENT_STACK.md`. Point at ADRs; do not paste them.
