# GATED_WORK.md
When any trigger matches → plan at start of In Progress → Justin approves → implement → security review of diff vs plan before Done. Trivial cards skip straight to implement. Review + Send-to-agent stay unchanged.

Triggers (any one):
- Auth, sessions, secrets, credentials, encryption
- PII / payment / financial data
- Schema, migrations, data deletion/export
- IAM, infra, networking, CI privilege changes
- New dependency or major version bump
- New external integration / webhook
- Changing SECURITY or SCOPE themselves
- Blast radius beyond the card’s listed files

Non-triggers (unless a trigger also applies): UI copy, styling, tests for existing behavior, docs-only, typos.

HOTFIX: see HOTFIX.md — still bound by SECURITY/SCOPE; never skip for auth/secrets/schema.
