# Hotfix — when to skip the plan gate

Use only when **all** are true:

1. Touching ≤ ~3 files (or one tightly scoped package path)
2. No auth, secrets, sessions, crypto, payments, PII, schema/migrations, infra/IAM, or new dependencies
3. No new public API / trust boundary
4. SCOPE still applies — no drive-by refactors or formatting sweeps

If unsure → treat as **gated** (GATED_WORK).

HOTFIX (and other non-gated cards) skip the plan kick. They still need label `clear-for-ip` on Ready; In Progress pulls from Ready only. Do not wait for plan approval in IP.

## Still required
- SECURITY + SCOPE always apply
- Fill TASK_TEMPLATE Goal / In scope / Out of scope / Verify
- Commit + draft PR (base `dev` only) as usual when on a KanDev card
