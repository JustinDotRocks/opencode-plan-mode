import { For, Show } from "solid-js"
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import {
  commandForControl,
  controlLabel,
  isResearchPlanMode,
  PLAN_PANEL_NAME,
  planChromeControls,
  type PlanChromeControl,
} from "./tui-controls.ts"

export { PLAN_PANEL_NAME }

function PlanButtons(props: { sessionID: string }) {
  const context = usePlugin()
  const session = () => context.data.session.get(props.sessionID)
  const inPlanMode = () => isResearchPlanMode(session())
  const controls = () => planChromeControls(inPlanMode())

  const runControl = (control: PlanChromeControl) => {
    const { name, text } = commandForControl(control)
    void context.client.session.command({ sessionID: props.sessionID, name, text })
  }

  return (
    <box flexDirection="row" gap={1}>
      <For each={[...controls()]}>
        {(control) => (
          <text onMouseUp={() => runControl(control)}>{controlLabel(control)}</text>
        )}
      </For>
    </box>
  )
}

function PlanComposerChrome(props: { sessionID: string }) {
  const context = usePlugin()
  const inPlanMode = () => isResearchPlanMode(context.data.session.get(props.sessionID))

  const runControl = (control: PlanChromeControl) => {
    const { name, text } = commandForControl(control)
    void context.client.session.command({ sessionID: props.sessionID, name, text })
  }

  context.keymap.layer(() => ({
    commands: [
      {
        id: "plan-mode.enter",
        title: "Enter plan mode",
        group: "plan-mode",
        palette: true,
        enabled: () => !inPlanMode(),
        run: () => runControl("enter"),
      },
      {
        id: "plan-mode.exit",
        title: "Exit plan mode (keep draft)",
        group: "plan-mode",
        palette: true,
        enabled: () => inPlanMode(),
        run: () => runControl("exit"),
      },
      {
        id: "plan-mode.discard",
        title: "Discard plan draft",
        group: "plan-mode",
        palette: true,
        enabled: () => inPlanMode(),
        run: () => runControl("discard"),
      },
    ],
  }))

  return <PlanButtons sessionID={props.sessionID} />
}

export default Plugin.define({
  id: "plan-mode.tui",
  setup(context) {
    const unslotComposer = context.ui.slot({
      append: "session.composer.top",
      render: (input) => <PlanComposerChrome sessionID={input.sessionID} />,
    })

    const unslotPanel = context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === PLAN_PANEL_NAME}>
          <box>
            <box flexDirection="row" gap={1}>
              <text>Plan</text>
              <PlanButtons sessionID={panel.sessionID} />
              <text onMouseUp={() => panel.close()}>Close</text>
            </box>
          </box>
        </Show>
      ),
    })

    return () => {
      unslotComposer()
      unslotPanel()
    }
  },
})
