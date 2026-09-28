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
    "- Project edits, shell, and Code Mode are blocked. Write only the plan artifact.",
    `- Artifact (source of truth): ${input.planPath}`,
    created,
    "- Open that file in your editor to change sections/steps, or use plan_write.",
    "- /plan-show displays the current file + checklist. OpenCode has no plan sidebar.",
    "- Exit without approving: /plan-exit (keeps the draft) or /plan-exit discard.",
  ].join("\n")
}

export function alreadyOnStatus(planPath: string): string {
  return [
    "Plan mode is already ON (research only).",
    `Artifact (source of truth): ${planPath}`,
    "Edit that file before approve, or /plan-show to reprint it.",
    "Exit: /plan-exit (keep) or /plan-exit discard.",
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

export function researchInstructions(planPath: string): string {
  return [
    "You are in Plan mode (research-only phase).",
    "The user must clearly see that Plan mode is on: do not implement, edit the project, or run mutating shell commands.",
    "Prefer read, glob, grep, webfetch, and websearch. Explore the repo as needed to ground the plan.",
    `The markdown file at ${planPath} is the source of truth — not this chat.`,
    "The user may edit Goal, Research, Steps (checklist), and Notes in that file at any time before approve.",
    "Use plan_read to load the latest file and plan_write to update structured sections. Always re-read after the user edits.",
    "Do not execute the plan. Approval and execute are separate follow-up commands.",
  ].join(" ")
}
