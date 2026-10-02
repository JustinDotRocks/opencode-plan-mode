# AGENTS.md — always-on (keep short)

## Priority order (conflicts)
1. **SECURITY** — never trade away
2. **SCOPE** — no unrelated logic
3. **ARCHITECTURE** — prefer existing seams / ADRs
4. Everything else (speed, niceties, drive-bys)

## Before coding (every card / session)
1. Scan **GATED_WORK** triggers (`docs/agent/GATED_WORK.md`).
2. If any match: plan kick is **manual in Backlog** (not auto, not at IP start). Agent plans only → Justin approves. **No project edits** and **no auto-pull from Backlog** until label **`clear-for-ip`** on **Ready**. Gated cards **cannot enter In Progress** without that label.
3. If none match (or HOTFIX applies): no plan kick. Same label on **Ready** before IP, then implement under SECURITY + SCOPE.
4. In Progress auto-pulls from **Ready** only: implement hands-off through commit + draft PR, base **`dev`** only. Do not wait on plan approval in IP.
5. Fill **TASK_TEMPLATE** (Goal / In / Out / Verify).

## Load
- Always: this file + `docs/agent/SECURITY.md` + `docs/agent/SCOPE.md`
- When needed: `docs/agent/ARCHITECTURE.md`, `docs/agent/GATED_WORK.md`, `docs/agent/HOTFIX.md`, `docs/agent/KANDEV_MAP.md`, `docs/agent/TASK_TEMPLATE.md`
- Stack notes: `docs/agent/AGENT_STACK.md`

Do not paste full ADRs into every turn. Point at them.
