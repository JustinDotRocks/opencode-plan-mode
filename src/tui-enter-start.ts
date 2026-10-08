import { runPlanSessionControl } from "./tui-controls.ts"

export type EnterPlanOnStartDeps = {
  createSession: () => Promise<string>
  runCommand: (input: { sessionID: string; name: string; text: string }) => Promise<unknown>
  navigateToSession: (sessionID: string) => void | Promise<void>
  openPlanPanel: (name: string) => void | Promise<void>
}

export async function enterPlanOnStart(deps: EnterPlanOnStartDeps): Promise<string> {
  const sessionID = await deps.createSession()
  await runPlanSessionControl("enter", sessionID, {
    runCommand: deps.runCommand,
    openPlanPanel: async (name) => {
      await deps.navigateToSession(sessionID)
      await deps.openPlanPanel(name)
    },
  })
  return sessionID
}
