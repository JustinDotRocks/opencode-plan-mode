# KanDev map (B+C hybrid)

Board stays: **Backlog → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Cards sit quiet. Plan is **manually triggered** (not auto on every backlog entry). When kicked: agent plans only → Justin approves → card marked **clear for IP**. | Gated: plan only until clear. Non-gated / HOTFIX: no plan kick. |
| In Progress | Auto-pulls when WIP frees, only from **clear** backlog cards. Gated cards **cannot enter IP** without plan approved / clear for IP. | Once in IP: implement hands-off through commit + **draft PR**. No plan-approval wait in IP. No auto-merge. |
| Review | Human + AI Review; Send-to-agent fixes stay in Review on **this PR branch** | Justin commits remediations; agent does not auto-resolve findings |
| Done | Justin merges bottom-up | — |

## Hard rules
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- Plan kick + Justin approve happen in **Backlog**. Not at start of In Progress.
- Gated cards **cannot enter In Progress** without “plan approved / clear for IP.”
- Non-gated or HOTFIX can pull to IP with no plan kick (still SECURITY + SCOPE).
- After pull, IP is hands-off implement through commit + draft PR.

## Enforcement (next install step)
Wire KanDev so a gated card cannot move to In Progress until Justin marks it plan approved / clear for IP. Docs alone can under-gate.
