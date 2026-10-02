# ARCHITECTURE.md
Priority 2. Project: OpenCode Plan Mode plugin (`opencode-plan-mode`).

## Standing rules
- Prefer existing modules, patterns, and boundaries over new ones.
- New cross-cutting concerns (auth, data, messaging, jobs) need an ADR before implement.
- Keep layers honest: plugin surface ≠ core plan logic ≠ provider/ACP adapters.
- Public API/contract changes only with explicit card scope (+ ADR if breaking).
- Match the project’s established stack (OpenCode plugin / TypeScript); no parallel frameworks.

## This repo (sketch — refine as ADRs land)
- Plan Mode: enter/exit + research-only, editable plan artifact, approve/reject gate, then execute.
- Prefer OpenCode 2 plugin APIs and existing session/`[PLAN]` patterns over new side channels.
- Cursor ACP / KanDev integration lives at the board edge; do not entangle plan-core with board UI.

## ADR required when
New service/module boundary; schema/data-model change; auth/authz model change; new external integration; replacing an established pattern.

## ADR template
```
# ADR-XXX: Title
Date:
Status: Proposed | Accepted | Superseded
Context:
Decision:
Consequences:
Security notes:
Alternatives considered:
```
