# KanDev map (B+C hybrid)

Board: **Backlog → Ready → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Idle. Plan is a **manual kick** (not auto). When kicked: agent plans only → Justin approves. Do **not** auto-pull from Backlog. | Gated: plan only until approved. Non-gated / HOTFIX: no plan kick. |
| Ready | Auto-pull feeder for In Progress. **Ready is the gate** — not a required `clear-for-ip` label. | After approve (gated) or skip-plan (non-gated / HOTFIX), Justin moves the card here. |
| In Progress | Auto-pulls from **Ready** only, when WIP frees. | Implement hands-off → draft PR. Stacked cards: see below. Independent PRs base **`dev`**. Never open or merge to `main` unless Justin is promoting a major feature. No plan-approval wait in IP. |
| Review | Human + AI Review. **Send-to-agent stays in Review on this PR branch** (remediation loop). | Justin commits remediations; agent does not auto-resolve findings. Ready is only a **full re-queue** of another IP run — not normal Send-to-agent. |
| Done | Justin merges to `dev` (staging). | — |

## Quiet create
Agent titles off → chevron → **Create** without starting an agent. CLI fallback: `kd-quiet`.

## Stacking
If a later card depends on an earlier one, put `Depends on: T-(N-1)` in that later card’s **task prompt/body** (not the description). Independent cards → PR base `dev`. If the depended-on PR is still open, base this PR on that task branch.

## Hard rules
- **Backlog and Ready: plan + ticket text only.** No git, no code edits, no remote sync, no branch create/push/reset. **Implement / verify / branch work only in In Progress.** Remediations only in **Review** (Send-to-agent stays on this PR branch).
- **Backlog titles** start with `T-N` for queue order (e.g. `T-1 — …`, `T-2 — …`). Manual numbering; increment for new cards.
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- Plan kick + Justin approve happen in **Backlog**. Not at start of In Progress. Do not auto-pull from Backlog.
- **Ready is the gate.** Do not require label `clear-for-ip`. Gated cards enter IP only after approve + move to Ready.
- In Progress auto-pulls from **Ready** only. After pull: implement hands-off through commit + draft PR (independent → base `dev`).
- Send-to-agent stays in Review on this PR branch. Move to Ready only to fully re-queue another IP run.

## Enforcement (next install step)
Wire KanDev so auto-pull is from **Ready** only. Docs alone can under-gate.
