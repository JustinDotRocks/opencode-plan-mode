# KanDev map (B+C hybrid)

Board: **Backlog → Ready → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Idle. Plan is a **manual kick** (not auto). When kicked: agent plans only → Justin approves → **clear for IP**. Do **not** auto-pull from Backlog. | Gated: plan only until approved. Non-gated / HOTFIX: no plan kick. |
| Ready | Auto-pull feeder for In Progress. | Label **`clear-for-ip`** before/when the card moves here. Nothing without that marker is clear. |
| In Progress | Auto-pulls from **Ready** only, when WIP frees. | Hands-off implement. **Draft PRs base = `dev` only.** Never open or merge to `main` unless Justin is promoting a major feature. Stacked PRs base the prior open PR branch. No plan-approval wait in IP. |
| Review | Human + AI Review. **Send-to-agent stays in Review on this PR branch** (remediation loop). | Justin commits remediations; agent does not auto-resolve findings. Ready is only a **full re-queue** of another IP run — not normal Send-to-agent. |
| Done | Justin merges to `dev` (staging). Promotion `dev` → `main` is Justin-only. | — |

## Staging / branches
- GitHub **`default_branch` stays `main`**. That is release / major-feature promotion, not the agent PR base. Optional: protect `main` so only Justin can promote.
- Day-to-day feature work lands on **`dev`** (staging).
- **Draft PRs base = `dev` only.** Never open or merge to `main` unless Justin is promoting a major feature.
- If this card depends on a previous task that still has an open PR, base on that previous task branch (stacked). Otherwise base on `dev`.

## Hard rules
- **Backlog and Ready: plan + ticket text only.** No git, no code edits, no remote sync, no branch create/push/reset. **Implement / verify / branch work only in In Progress.** Remediations only in **Review** (Send-to-agent stays on this PR branch).
- **Backlog titles** start with `T-N` for queue order (e.g. `T-1 — …`, `T-2 — …`). Manual numbering; increment for new cards.
- **Quiet Backlog cards:** New Task → open chevron beside Start task → **Create without starting agent** (title/description only; no Plan Mode / no agent).
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- **Backlog owns** plan kick → Justin approve → clear for IP. Not at start of In Progress. Do not auto-pull from Backlog.
- **`clear-for-ip`** is required before/when a card moves to Ready. No marker → not clear. Gated cards **cannot enter In Progress** without it.
- In Progress auto-pulls from **Ready** only. After pull: implement hands-off through commit + draft PR. **Draft PRs base = `dev` only.** Never open or merge to `main` unless Justin is promoting a major feature.
- Send-to-agent stays in Review on this PR branch. Move to Ready only to fully re-queue another IP run.

## Enforcement (next install step)
Wire KanDev so nothing reaches Ready or In Progress without label `clear-for-ip`. Docs alone can under-gate.
