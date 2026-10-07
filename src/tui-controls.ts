import { PLAN_TITLE_PREFIX } from "./status.ts"

/** Session panel selection name. T-7+ open this surface; T-6 only registers it. */
export const PLAN_PANEL_NAME = "plan-mode.plan"

export type PlanChromeControl = "enter" | "exit" | "discard"

export type SessionPlanHint = {
  readonly agent?: string
  readonly title?: string
}

/** Research-only plan mode as visible in the TUI (agent + `[PLAN]` title). */
export function isResearchPlanMode(session: SessionPlanHint | undefined): boolean {
  if (!session) return false
  if (session.agent === "plan") return true
  return Boolean(session.title?.startsWith(PLAN_TITLE_PREFIX))
}

export function planChromeControls(inPlanMode: boolean): readonly PlanChromeControl[] {
  return inPlanMode ? ["exit", "discard"] : ["enter"]
}

/** Closing or hiding the T-7 panel is not `/plan-exit` and must not discard. */
export function panelCloseExitsPlanMode(): boolean {
  return false
}

export function commandForControl(control: PlanChromeControl): { name: string; text: string } {
  if (control === "enter") return { name: "plan", text: "" }
  if (control === "discard") return { name: "plan-exit", text: "discard" }
  return { name: "plan-exit", text: "" }
}

export function controlLabel(control: PlanChromeControl): string {
  if (control === "enter") return "Enter plan"
  if (control === "discard") return "Discard"
  return "Exit (keep)"
}
