# AGENTS.base.md

## Priority (every agent, every turn)

1. Security — never trade away (SECURITY.md)
2. Scope — no unrelated logic (SCOPE.md)
3. Architecture — prefer existing seams / ADRs
4. Everything else (speed, niceties, drive-bys)

## Delivery

- Stick to the approved plan as written.
- Do not reinterpret, rewrite, or expand it.
- If unclear or blocked: stop and ask Justin.
- Surgical diffs only.

## Load

- Always: this pack’s `SECURITY.md` + `SCOPE.md` **and** the consuming project’s `docs/project/PROJECT.md`.
- When needed: consuming `docs/project/ARCHITECTURE.md` and the other pack files (`GATED_WORK.md`, `HOTFIX.md`, `KANDEV_MAP.md`, `TASK_TEMPLATE.md`, `AGENT_STACK.md`).
- Project overlay may **add** rules; it must **never weaken** SECURITY or SCOPE.
- Point at ADRs; do not paste them.
