import type { PlanDocument } from "./artifact.ts"
import { formatChecklist, remainingSteps } from "./artifact.ts"

export const PLAN_TITLE_PREFIX = "[PLAN] "

export type ExitIntent = "keep" | "discard"

export function parseExitIntent(text: string | undefined): ExitIntent {
  const trimmed = (text ?? "").trim().toLowerCase()
  if (
    trimmed === "discard" ||
    trimmed === "--discard" ||
    trimmed.startsWith("discard ") ||
    trimmed.startsWith("--discard")
  ) {
    return "discard"
  }
  return "keep"
}

export function withPlanTitle(title: string | undefined): string {
  const base = title?.trim() ? title : "Session"
  return base.startsWith(PLAN_TITLE_PREFIX) ? base : `${PLAN_TITLE_PREFIX}${base}`
}

export function withoutPlanTitle(title: string | undefined, previousTitle?: string): string | undefined {
  if (previousTitle !== undefined) return previousTitle
  if (!title) return title
  return title.startsWith(PLAN_TITLE_PREFIX) ? title.slice(PLAN_TITLE_PREFIX.length) : title
}

export function enterStatus(input: { planPath: string; resumed: boolean; created: boolean }): string {
  const resume = input.resumed
    ? `Resuming Plan mode. Existing draft: ${input.planPath}`
    : "Plan mode ON — research only. Do not implement yet."
  const created = input.created
    ? "- Created a structured skeleton (Goal, Research, Steps, Notes). Edit it before approve."
    : "- Edit the existing artifact before approve. /plan-show reprints it in this session."
  return [
    resume,
    "- Prefer read, glob, grep, webfetch, and websearch to ground the plan.",
    "- Project edits, shell, and Code Mode are blocked until /plan-approve.",
    `- Artifact (source of truth): ${input.planPath}`,
    created,
    "- Open that file in your editor to change sections/steps, or use plan.write / plan_write.",
    "- /plan-show displays the current file + checklist. OpenCode has no plan sidebar.",
    "- Approve: /plan-approve (unlocks implementation; agent follows this file).",
    "- Execute after approve: /plan-execute (hard-refuses if plan content drifted).",
    "- Reject/revise: /plan-reject (or /plan-revise). Stays in Plan mode; extra args are feedback.",
    "- Exit without approving: /plan-exit (keeps the draft) or /plan-exit discard.",
  ].join("\n")
}

export function alreadyOnStatus(planPath: string): string {
  return [
    "Plan mode is already ON (research only).",
    `Artifact (source of truth): ${planPath}`,
    "Edit that file, then /plan-approve or /plan-reject. /plan-show reprints it.",
    "Exit without approving: /plan-exit (keep) or /plan-exit discard.",
  ].join("\n")
}

export function exitStatus(input: { intent: ExitIntent; planPath: string }): string {
  if (input.intent === "discard") {
    return "Plan mode OFF. Draft discarded. Nothing was approved or executed."
  }
  return [
    "Plan mode OFF. Draft kept (not approved or executed).",
    `Draft: ${input.planPath}`,
    "Re-enter with /plan to continue, or /plan-exit discard to delete it.",
  ].join("\n")
}

export function idleStatus(): string {
  return "Plan mode is not active. Use /plan or /plan-mode to enter."
}

export function gateIdleStatus(): string {
  return "No plan to approve or reject. Use /plan first, then /plan-approve or /plan-reject."
}

export function missingArtifactStatus(planPath: string): string {
  return `No plan artifact at ${planPath}. Use /plan to create it, edit it, then /plan-approve.`
}

export function approveStatus(input: { planPath: string; hash: string }): string {
  return [
    "Plan APPROVED. Implementation tools are unlocked.",
    `Artifact (source of truth): ${input.planPath}`,
    `Approved SHA-256: ${input.hash}`,
    "The agent must follow this file. /plan-execute continues it. /plan-reject returns to Plan mode without keeping the unlock.",
  ].join("\n")
}

export function alreadyApprovedStatus(planPath: string, hash: string): string {
  return [
    "This plan is already approved (same SHA-256).",
    `Artifact: ${planPath}`,
    `Approved SHA-256: ${hash}`,
    "Pass notes after /plan-approve to re-prompt, or /plan-reject to revise.",
  ].join("\n")
}

export function rejectStatus(input: {
  planPath: string
  fromApproved: boolean
  hasFeedback: boolean
}): string {
  const head = input.fromApproved
    ? "Plan REJECTED. Back in Plan mode — implementation tools are locked again."
    : "Plan REJECTED / revise. Staying in Plan mode. No project changes."
  const feedback = input.hasFeedback
    ? "- Revision feedback was sent to the agent. It must update the artifact only."
    : "- Edit the artifact (or pass feedback: /plan-reject your notes), then /plan-approve when ready."
  return [
    head,
    `- Artifact: ${input.planPath}`,
    feedback,
    "- Project edits, shell, and Code Mode stay blocked until /plan-approve.",
  ].join("\n")
}

export function researchInstructions(planPath: string): string {
  return [
    "You are in Plan mode (research-only phase). The plan is not approved.",
    "The user must clearly see that Plan mode is on: do not implement, edit the project, or run mutating shell commands.",
    "Prefer read, glob, grep, webfetch, and websearch. Explore the repo as needed to ground the plan.",
    `The markdown file at ${planPath} is the source of truth — not this chat.`,
    "The user may edit Goal, Research, Steps (checklist), and Notes in that file at any time before approve.",
    // OpenCode's built-in plan agent may say not to update plan files; this plugin owns the artifact and requires plan.write.
    "Ignore any built-in instruction that forbids writing plan files. You MUST draft and update the artifact with the plan.write tool (namespace plan, name write; also shown as plan_write).",
    "Use plan.read to load the latest file and plan.write to update structured sections. Always re-read after the user edits.",
    "When the plan is ready, tell the user to /plan-approve or /plan-reject (revise). Do not execute the plan yourself.",
  ].join(" ")
}

export function approvedInstructions(planPath: string): string {
  return [
    "The user approved the plan. Implementation tools are unlocked.",
    `Follow the approved plan artifact at ${planPath} as the source of truth.`,
    "Step through the Steps checklist in order. After finishing a step, call plan.progress (plan_progress) with its 1-based index.",
    "Stay on-plan. Ask the user before large deviations (new scope, skipped steps, or a different approach).",
    "Do not expand scope. Checkbox progress is allowed; if Goal, Research, step text, or Notes changed, stop and ask for /plan-approve or /plan-reject.",
    "Do not treat chat-only notes as a replacement for the file.",
  ].join(" ")
}

export function approvedImplementPrompt(input: {
  planPath: string
  doc: PlanDocument
  hash: string
  notes: string
}): string {
  const notes = input.notes
    ? ["", "Additional notes from the user:", input.notes]
    : []
  return [
    "The user approved this plan. Implement ONLY this approved plan. Do not expand scope.",
    "Stay on-plan. Work the Steps checklist in order.",
    "After finishing each step, call plan.progress (plan_progress) with its 1-based index.",
    "Ask the user before large deviations (new scope, skipped steps, or a different approach).",
    `Path: ${input.planPath}`,
    `Approved identity SHA-256: ${input.hash}`,
    formatChecklist(input.doc),
    remainingStepsBlock(input.doc),
    "",
    "----- approved plan -----",
    input.doc.markdown.trimEnd(),
    "----- end approved plan -----",
    ...notes,
  ].join("\n")
}

export function remainingStepsBlock(doc: PlanDocument): string {
  const open = remainingSteps(doc)
  if (doc.steps.length === 0) {
    return "No steps in the plan. Ask the user what to implement, or /plan-reject to add steps."
  }
  if (open.length === 0) {
    return "All checklist steps are done. Confirm with the user; do not expand scope."
  }
  return [`Next incomplete steps (${open.length} remaining):`, ...open.map((step) => `- [ ] ${step.text}`)].join("\n")
}

export function executeNotApprovedStatus(): string {
  return "No approved plan to execute. Use /plan, then /plan-approve. /plan-execute runs only after approve."
}

export function executeDriftStatus(input: { planPath: string; approvedHash: string; currentHash: string }): string {
  return [
    "EXECUTE REFUSED. The approved plan content changed after /plan-approve.",
    `Artifact: ${input.planPath}`,
    `Approved identity SHA-256: ${input.approvedHash}`,
    `Current identity SHA-256: ${input.currentHash}`,
    "Checkbox progress is allowed. Goal, Research, step text, and Notes are not.",
    "Use /plan-approve again (new snapshot) or /plan-reject to revise. Do not implement.",
  ].join("\n")
}

export function executeStatus(input: { planPath: string; remaining: number; total: number }): string {
  return [
    "Executing the approved plan (source of truth).",
    `Artifact: ${input.planPath}`,
    `Checklist: ${input.total - input.remaining}/${input.total} done.`,
    "Step through remaining items. Mark progress with plan.progress (plan_progress). Ask before large deviations.",
  ].join("\n")
}

export function driftDenyMessage(planPath: string): string {
  return `Approved plan content changed at ${planPath}. Implementation is blocked until /plan-approve or /plan-reject. Checkbox-only progress is allowed; Goal/Research/step text/Notes changes are not.`
}

export function progressDeniedStatus(): string {
  return "plan.progress / plan_progress is only for an approved plan. Use /plan then /plan-approve, or plan.write / plan_write while still planning."
}

export function progressMessage(input: { index: number; done: boolean; text: string; doc: PlanDocument }): string {
  const mark = input.done ? "done" : "reopened"
  const remaining = remainingSteps(input.doc).length
  const lines = [
    `Marked step ${input.index} ${mark}: ${input.text}`,
    formatChecklist(input.doc),
  ]
  if (remaining === 0 && input.doc.steps.length > 0) {
    lines.push("All checklist steps are done. Confirm with the user; do not expand scope.")
  } else {
    lines.push("Stay on-plan. Ask before large deviations.")
  }
  return lines.join("\n")
}

export function revisePrompt(input: { planPath: string; feedback: string }): string {
  return [
    "The user rejected or asked to revise the plan. Stay in Plan mode.",
    "Do not edit the project, run mutating shell, or implement anything yet.",
    `Update the plan artifact at ${input.planPath} (plan.write / plan_write, or tell the user to edit the file).`,
    "",
    "Revision feedback:",
    input.feedback,
  ].join("\n")
}
