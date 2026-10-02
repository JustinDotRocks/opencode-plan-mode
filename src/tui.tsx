import { Show } from "solid-js"
import { Plugin } from "@opencode/plugin/tui"

/** Session panel selection name. T-7+ open this surface; T-6 only registers it. */
export const PLAN_PANEL_NAME = "plan-mode.plan"

export default Plugin.define({
  id: "plan-mode.tui",
  setup(context) {
    return context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === PLAN_PANEL_NAME}>
          <box>
            <text>Plan</text>
          </box>
        </Show>
      ),
    })
  },
})
