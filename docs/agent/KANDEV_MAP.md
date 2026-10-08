# KanDev map (B+C hybrid)

Board: **Backlog → Ready → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Idle. Plan is a **manual kick** (not auto). When kicked: agent plans only → Justin approves. Do **not** auto-pull from Backlog. | Gated: plan only until approved. Non-gated / HOTFIX: no plan kick. |
| Ready | Auto-pull feeder for In Progress. **Ready is the gate** — not a required `clear-for-ip` label. | After approve (gated) or skip-plan (non-gated / HOTFIX), Justin moves the card here. |
| In Progress | Auto-pulls from **Ready** only, when WIP frees. | Hands-off implement. PR base: see **Stacking**. Never open or merge to `main` unless Justin is promoting a major feature. No plan-approval wait in IP. |
| Review | Human + AI Review. **Send-to-agent stays in Review on this PR branch** (remediation loop). | Justin commits remediations; agent does not auto-resolve findings. Ready is only a **full re-queue** of another IP run — not normal Send-to-agent. |
| Done | Justin merges to `dev` (staging). Promotion `dev` → `main` is Justin-only. | — |

## Staging / branches
- GitHub **`default_branch` stays `main`**. That is release / major-feature promotion, not the agent PR base. Optional: protect `main` so only Justin can promote.
- Day-to-day feature work lands on **`dev`** (staging).
- **Draft PRs base = `dev` only.** Never open or merge to `main` unless Justin is promoting a major feature.
- If this card depends on a previous task that still has an open PR, base on that previous task branch (stacked). Otherwise base on `dev`.

## Quiet create
Agent titles off → chevron → **Create** without starting an agent. CLI fallback: `kd-quiet`.

## Stacking
Dependent card **body** (not description): one line `Depends on: T-N`. Plan: `Builds on T-N; assume its changes exist.` Keep chains linear. Parents above children in Ready. IP is WIP 1, top to bottom.

**PR base:** no `Depends on` → PR to `dev`. Parent merged → merge `origin/dev`, PR to `dev`. Parent open → merge the parent branch (no rebase, no force-push), PR against that branch, PR body starts `Stacked on #N. Merge after it.` Parent has no PR → skip and `step_complete` with BLOCKED. Never open or merge to `main` unless Justin is promoting.

**KanDev built-in Depends on:** do not use for overnight chains (it waits until the parent is Done/merged). Use it only when a card must wait for a merge.

**Morning review:** review in chain order. Merge the parent first in the GitHub web UI with **Automatically delete head branches** on so GitHub retargets the child to `dev`. Do not `gh pr merge --delete-branch` on a parent (it closes the child PR).

**Parent needs changes:** send the fix to the parent’s agent, then tell the child’s agent `merge origin/<parent branch>, push.`

**Parent dropped:** close it, retarget the child PR to `dev`, move the child back to Backlog to re-plan.

**Stuck card:** an IP agent that stops without `step_complete` holds the only IP slot and stalls the queue. Restart or move it by hand.

## Hard rules
- **Backlog and Ready: plan + ticket text only.** No git, no code edits, no remote sync, no branch create/push/reset. **Implement / verify / branch work only in In Progress.** Remediations only in **Review** (Send-to-agent stays on this PR branch).
- **Backlog titles** start with `T-N` for queue order (e.g. `T-1 — …`, `T-2 — …`). Manual numbering; increment for new cards.
- **Quiet Backlog cards:** New Task → open chevron beside Start task → **Create without starting agent** (title/description only; no Plan Mode / no agent).
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- Plan kick + Justin approve happen in **Backlog**. Not at start of In Progress. Do not auto-pull from Backlog.
- **Ready is the gate.** Do not require label `clear-for-ip`. Gated cards enter IP only after approve + move to Ready.
- In Progress auto-pulls from **Ready** only. After pull: implement hands-off through commit + draft PR. **PR base: see Stacking.** Never open or merge to `main` unless Justin is promoting a major feature.
- Send-to-agent stays in Review on this PR branch. Move to Ready only to fully re-queue another IP run.

## Enforcement
In Progress auto-pull is from **Ready** only (current). Docs describe the gate; KanDev enforces it.
