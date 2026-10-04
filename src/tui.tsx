import { For, Show, createSignal } from "solid-js"
import { Plugin, usePlugin } from "@opencode/plugin/tui"
import {
  commandForControl,
  controlLabel,
  isResearchPlanMode,
  PLAN_PANEL_NAME,
  planChromeControls,
  type PlanChromeControl,
} from "./tui-controls.ts"
import {
  approveDrifted,
  approveEnabled,
  commandForGate,
  commandPayloadText,
  driftLockMessage,
  gateControlLabel,
  panelGateVisible,
  rejectConfirmPrompt,
  rejectEnabled,
  rejectRequiresConfirm,
  type PanelGateControl,
} from "./tui-gate.ts"

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

function PlanPanelFooter(props: { sessionID: string }) {
  const context = usePlugin()
  const [confirming, setConfirming] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [payload, setPayload] = createSignal("")
  const session = () => context.data.session.get(props.sessionID)
  const visible = () => panelGateVisible(session())
  const drifted = () => approveDrifted({ payload: payload() })
  const inline = () => payload() || (drifted() ? driftLockMessage("the plan artifact") : "")

  const runGate = (control: PanelGateControl) => {
    if (busy()) return
    const { name, text } = commandForGate(control)
    setBusy(true)
    void Promise.resolve(context.client.session.command({ sessionID: props.sessionID, name, text }))
      .then((result) => {
        const next = commandPayloadText(result)
        if (next) setPayload(next)
      })
      .catch((error: unknown) => {
        const next = commandPayloadText(error)
        if (next) setPayload(next)
      })
      .finally(() => {
        setBusy(false)
        setConfirming(false)
      })
  }

  const onReject = () => {
    if (!rejectEnabled({ visible: visible(), busy: busy() })) return
    if (rejectRequiresConfirm() && !confirming()) {
      setConfirming(true)
      return
    }
    runGate("reject")
  }

  const onApprove = () => {
    if (!approveEnabled({ visible: visible(), drifted: drifted(), busy: busy() })) return
    runGate("approve")
  }

  const onCancelReject = () => {
    setConfirming(false)
  }

  return (
    <Show when={visible()}>
      <box flexDirection="column" gap={1}>
        <Show when={inline()}>
          <text>{inline()}</text>
        </Show>
        <Show
          when={confirming()}
          fallback={
            <box flexDirection="row" gap={1}>
              <text
                onMouseUp={() => {
                  if (approveEnabled({ visible: visible(), drifted: drifted(), busy: busy() })) onApprove()
                }}
              >
                {gateControlLabel("approve")}
              </text>
              <text
                onMouseUp={() => {
                  if (rejectEnabled({ visible: visible(), busy: busy() })) onReject()
                }}
              >
                {gateControlLabel("reject")}
              </text>
            </box>
          }
        >
          <box flexDirection="column" gap={1}>
            <text>{rejectConfirmPrompt()}</text>
            <box flexDirection="row" gap={1}>
              <text
                onMouseUp={() => {
                  if (rejectEnabled({ visible: visible(), busy: busy() })) onReject()
                }}
              >
                Confirm reject
              </text>
              <text onMouseUp={onCancelReject}>Cancel</text>
            </box>
          </box>
        </Show>
      </box>
    </Show>
  )
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
            <PlanPanelFooter sessionID={panel.sessionID} />
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
