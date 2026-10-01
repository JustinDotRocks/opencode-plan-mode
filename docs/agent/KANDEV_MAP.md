# KanDev map (B+C hybrid)

Board stays: **Backlog → In Progress → Review → Done**.

| Stage | What happens | Agent rules |
| --- | --- | --- |
| Backlog | Card ready; may pull when WIP frees | Read TASK_TEMPLATE when starting |
| In Progress (start) | **Scan GATED_WORK first.** If match → **plan only**, no project edits until Justin approves. Else (or HOTFIX) → implement | SECURITY, SCOPE, ARCHITECTURE; OpenCode `/plan` when gated |
| In Progress (build) | Implement approved plan or non-gated task; Ponytail on | Surgical diffs only; TASK_TEMPLATE verify |
| In Progress (end) | Commit + **draft PR** (stack base branch as today) | No auto-merge |
| Review | Human + AI Review; Send-to-agent fixes stay in Review on **this PR branch** | Justin commits remediations; agent does not auto-resolve findings |
| Done | Justin merges bottom-up | — |

## Hard rules
- Do **not** replace Review / Send-to-agent / draft-PR behavior.
- Plan gate is only at **start of In Progress** when triggered.
- Trivial work uses HOTFIX skip (still bound by SECURITY + SCOPE).
- Prompt trust until KanDev workflow/`custom_prompt` is wired to refuse implement before approve on gated cards.

## Enforcement (next install step)
Wire KanDev In Progress start so gated cards stay plan-only until Justin marks approved. Docs alone can under-gate.
