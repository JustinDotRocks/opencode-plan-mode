import type { PlanDocument } from "./artifact.ts"
import { formatChecklist } from "./artifact.ts"

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
    "- Open that file in your editor to change sections/steps, or use plan_write.",
    "- /plan-show displays the current file + checklist. OpenCode has no plan sidebar.",
    "- Approve: /plan-approve (unlocks implementation; agent follows this file).",
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
    "The agent must follow this file. /plan-reject returns to Plan mode without keeping the unlock.",
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
    "Use plan_read to load the latest file and plan_write to update structured sections. Always re-read after the user edits.",
    "When the plan is ready, tell the user to /plan-approve or /plan-reject (revise). Do not execute the plan yourself.",
  ].join(" ")
}

export function approvedInstructions(planPath: string): string {
  return [
    "The user approved the plan. Implementation tools are unlocked.",
    `Follow the approved plan artifact at ${planPath}. Do not expand scope.`,
    "If the file on disk no longer matches the approved SHA-256, stop and ask for /plan-approve or /plan-reject.",
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
    `Path: ${input.planPath}`,
    `Approved SHA-256: ${input.hash}`,
    formatChecklist(input.doc),
    "",
    "----- approved plan -----",
    input.doc.markdown.trimEnd(),
    "----- end approved plan -----",
    ...notes,
  ].join("\n")
}

export function revisePrompt(input: { planPath: string; feedback: string }): string {
  return [
    "The user rejected or asked to revise the plan. Stay in Plan mode.",
    "Do not edit the project, run mutating shell, or implement anything yet.",
    `Update the plan artifact at ${input.planPath} (plan_write or tell the user to edit the file).`,
    "",
    "Revision feedback:",
    input.feedback,
  ].join("\n")
}
