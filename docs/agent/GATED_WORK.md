# GATED_WORK.md
When any trigger matches, the card is gated. Plan is a **manual Backlog kick** (not auto on every backlog entry, not at IP start): agent plans only → Justin approves → move to **Ready** (the gate; `clear-for-ip` is not required). Do not auto-pull from Backlog. A gated card **cannot enter In Progress** until Ready. In Progress auto-pulls from **Ready** only: implement hands-off through commit + draft PR. **Draft PRs base = `dev` only.** Never open or merge to `main` unless Justin is promoting a major feature. No plan-approval wait. Security review of diff vs plan before Done. Non-gated and HOTFIX skip the plan kick; they still go through Ready. Review + Send-to-agent stay in Review on this PR branch.

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

HOTFIX: see HOTFIX.md — no plan kick. Still go through **Ready** before IP. Still bound by SECURITY/SCOPE; never skip for auth/secrets/schema.
