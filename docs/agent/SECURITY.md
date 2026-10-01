# SECURITY.md
Priority 1. Non-negotiable.

Must:
- Never log, commit, print, or paste secrets/tokens/keys/credentials/session material.
- Reuse existing auth/session patterns; no new auth flows without gated approval.
- Validate untrusted input at trust boundaries (user input, webhooks, uploads, external APIs).
- Fail closed on permission checks; never widen IAM/roles "temporarily."
- No new dependencies without gated approval; pin versions.

Must not:
- Commit `.env`, key files, or hardcoded secrets.
- Disable TLS/auth/CSRF/security headers to unblock a ticket.
- Move credentials, repo data, or PII outside channels Justin approved.
- Soften a security control to ship.

When unsure: stop and ask Justin. Security beats shipping.
