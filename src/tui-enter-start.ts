import { commandForControl } from "./tui-controls.ts"

export type EnterPlanOnStartDeps = {
  createSession: () => Promise<string>
  runCommand: (input: { sessionID: string; name: string; text: string }) => Promise<unknown>
  navigateToSession: (sessionID: string) => void | Promise<void>
}

export async function enterPlanOnStart(deps: EnterPlanOnStartDeps): Promise<string> {
  const sessionID = await deps.createSession()
  await deps.runCommand({ sessionID, ...commandForControl("enter") })
  await deps.navigateToSession(sessionID)
  return sessionID
}
