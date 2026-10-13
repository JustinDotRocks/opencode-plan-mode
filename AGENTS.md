# AGENTS.md — always-on (keep short)

## Priority (conflicts)
1. **SECURITY** — never trade away (`docs/agent/SECURITY.md`)
2. **SCOPE** — no unrelated logic (`docs/agent/SCOPE.md`)
3. **ARCHITECTURE** — prefer existing seams / ADRs
4. Everything else (speed, niceties, drive-bys)

## Delivery
Stick to the approved plan as written. Do not reinterpret, rewrite, or expand it. If it's unclear or blocked, stop and ask Justin. Surgical diffs only.

## Load
Always: SECURITY, SCOPE, `docs/project/PROJECT.md`. When needed: `docs/project/ARCHITECTURE.md` plus the other `docs/agent` files. Point at ADRs; do not paste them. Project files may add rules but never weaken SECURITY or SCOPE.
