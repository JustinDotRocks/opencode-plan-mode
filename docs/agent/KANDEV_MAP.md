Shared pack: edit in agent-guardrails, not here.
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
- See `docs/project/PROJECT.md`.
- PR base: see **Stacking**.

## Quiet create
See `docs/project/PROJECT.md`.

## Stacking
Justin writes `Depends on: T-N` as its own line in the task prompt he types when creating the card in KanDev (before Backlog). That prompt becomes {{task_prompt}}, which the IP agent reads. Not the description, and not the agent-written plan. No line means no stacking (base on dev). Plan: `Builds on T-N; assume its changes exist.` Keep chains linear. Parents above children in Ready. IP is WIP 1, top to bottom.

**PR base:** no `Depends on` → PR to `dev`. Parent merged → merge `origin/dev`, PR to `dev`. Parent open → merge the parent branch (no rebase, no force-push), PR against that branch, PR body starts `Stacked on #N. Merge after it.` Parent has no PR → skip and `step_complete` with BLOCKED. Parent PR closed unmerged, or parent BLOCKED (its card shows BLOCKED) → `step_complete` with BLOCKED and don't code. Before opening the PR, check the parent again. If it merged during the run, merge `origin/dev` and PR to `dev`. Never open or merge to `main` unless Justin is promoting.

**KanDev built-in Depends on:** do not use for overnight chains (it waits until the parent is Done/merged). Use it only when a card must wait for a merge.

**Morning review:** review in chain order. Merge the parent first in the GitHub web UI so GitHub retargets the child to `dev`. Merge stacked parents with a merge commit, not squash. If one was squashed, merge `origin/dev` into the child after GitHub retargets it. Do not `gh pr merge --delete-branch` on a parent (it closes the child PR).

**Repo settings (Justin):** GitHub **Automatically delete head branches** on; merge commits allowed; stacked parents merged with **Create a merge commit**.

**Parent needs changes:** Justin sends the fix to the parent in Review. Then each later card in the chain, in order, gets `merge origin/<its parent branch>, push` (T99, then T100).

**Parent dropped (Justin only):** close it, retarget the child PR to `dev`, move the child back to Backlog to re-plan. Agents never close, retarget, approve or merge PRs, and never move cards.

**Stuck card (Justin only):** an IP agent that stops without `step_complete` holds the only IP slot and stalls the queue. Restart or move it by hand. Agents never close, retarget, approve or merge PRs, and never move cards.

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
