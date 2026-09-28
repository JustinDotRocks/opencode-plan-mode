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

export function enterStatus(input: { planPath: string; resumed: boolean }): string {
  const resume = input.resumed
    ? `Resuming Plan mode. Existing draft: ${input.planPath}`
    : "Plan mode ON — research only. Do not implement yet."
  return [
    resume,
    "- Prefer read, glob, grep, webfetch, and websearch to ground the plan.",
    "- Project edits, shell, and Code Mode are blocked. Write only the plan artifact.",
    `- Artifact: ${input.planPath}`,
    "- Exit without approving: /plan-exit (keeps the draft) or /plan-exit discard.",
  ].join("\n")
}

export function alreadyOnStatus(planPath: string): string {
  return `Plan mode is already ON (research only).\nArtifact: ${planPath}\nExit: /plan-exit (keep) or /plan-exit discard.`
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
    `When you have enough context, write or update the markdown plan at: ${planPath}`,
    "Do not execute the plan. Approval and execute are separate follow-up commands.",
  ].join(" ")
}
