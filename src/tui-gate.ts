import { driftDenyMessage } from "./status.ts"
import { isResearchPlanMode, type SessionPlanHint } from "./tui-controls.ts"

/** Footer actions in the T-7 plan panel. Not session/header chrome (T-8). */
export type PanelGateControl = "approve" | "reject"

/** TUI-visible pending plan: research-only session (agent/`[PLAN]`). Approved sessions drop both. */
export function hasPendingPlan(session: SessionPlanHint | undefined): boolean {
  return isResearchPlanMode(session)
}

export function panelGateVisible(session: SessionPlanHint | undefined): boolean {
  return isResearchPlanMode(session) && hasPendingPlan(session)
}

export function panelGateControls(visible: boolean): readonly PanelGateControl[] {
  return visible ? ["approve", "reject"] : []
}

export function commandForGate(control: PanelGateControl): { name: string; text: string } {
  if (control === "approve") return { name: "plan-approve", text: "" }
  return { name: "plan-reject", text: "" }
}

export function gateControlLabel(control: PanelGateControl): string {
  if (control === "approve") return "Approve"
  return "Reject/revise"
}

export function rejectRequiresConfirm(): boolean {
  return true
}

export function rejectConfirmPrompt(): string {
  return "Reject/revise this plan? Stay in Plan mode. Implementation stays locked until /plan-approve. Cancel does not call the API."
}

export function approveEnabled(input: { visible: boolean; drifted: boolean; busy: boolean }): boolean {
  return input.visible && !input.drifted && !input.busy
}

export function rejectEnabled(input: { visible: boolean; busy: boolean }): boolean {
  return input.visible && !input.busy
}

/** Existing re-lock copy. No new lock rules. */
export function driftLockMessage(planPath: string): string {
  return driftDenyMessage(planPath)
}

export function isDriftRelockCopy(text: string): boolean {
  if (!text) return false
  return (
    text.includes("Implementation is blocked until /plan-approve or /plan-reject") ||
    text.includes("EXECUTE REFUSED. The approved plan content changed") ||
    text.includes("The approved plan content changed (identity SHA-256")
  )
}

export function commandPayloadText(result: unknown): string {
  if (result == null) return ""
  if (typeof result === "string") return result
  if (result instanceof Error) return result.message
  if (typeof result !== "object") return ""
  const record = result as Record<string, unknown>
  for (const key of ["text", "message", "error"] as const) {
    const value = record[key]
    if (typeof value === "string") return value
  }
  return ""
}

export function identityHashesMatch(approvedHash: string | undefined, currentHash: string | undefined): boolean {
  return approvedHash !== undefined && currentHash !== undefined && approvedHash === currentHash
}

export function approveDrifted(input: {
  payload?: string
  approvedHash?: string
  currentHash?: string
}): boolean {
  if (input.payload && isDriftRelockCopy(input.payload)) return true
  if (input.approvedHash === undefined || input.currentHash === undefined) return false
  return !identityHashesMatch(input.approvedHash, input.currentHash)
}
