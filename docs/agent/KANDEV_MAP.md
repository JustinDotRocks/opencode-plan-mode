# KanDev map (B+C hybrid)

Board: **Backlog → Ready → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Idle. Plan is a **manual kick** (not auto). When kicked: agent plans only → Justin approves. Do **not** auto-pull from Backlog. | Gated: plan only until approved. Non-gated / HOTFIX: no plan kick. |
| Ready | Auto-pull feeder for In Progress. | Label **`clear-for-ip`** before/when the card moves here. Nothing without that marker is clear. |
| In Progress | Auto-pulls from **Ready** only, when WIP frees. | Implement hands-off → draft PR **base = `dev` only**. Never open or merge to `main` unless Justin is promoting a major feature. No plan-approval wait in IP. |
| Review | Human + AI Review. **Send-to-agent stays in Review on this PR branch** (remediation loop). | Justin commits remediations; agent does not auto-resolve findings. Ready is only a **full re-queue** of another IP run — not normal Send-to-agent. |
| Done | Justin merges to `dev` (staging). | — |

## Hard rules
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- Plan kick + Justin approve happen in **Backlog**. Not at start of In Progress. Do not auto-pull from Backlog.
- **`clear-for-ip`** is required before/when a card moves to Ready. No marker → not clear. Gated cards **cannot enter In Progress** without it.
- In Progress auto-pulls from **Ready** only. After pull: implement hands-off through commit + draft PR (base `dev` only).
- Send-to-agent stays in Review on this PR branch. Move to Ready only to fully re-queue another IP run.

## Enforcement (next install step)
Wire KanDev so nothing reaches Ready or In Progress without label `clear-for-ip`. Docs alone can under-gate.
