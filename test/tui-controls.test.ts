import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { parseExitIntent } from "../src/status.ts"
import {
  commandForControl,
  controlLabel,
  isResearchPlanMode,
  panelCloseExitsPlanMode,
  PLAN_PANEL_NAME,
  planChromeControls,
  runPlanSessionControl,
} from "../src/tui-controls.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("enter control invokes /plan with empty args", () => {
  assert.deepEqual(commandForControl("enter"), { name: "plan", text: "" })
})

test("primary exit keeps the draft like /plan-exit with no args", () => {
  const invocation = commandForControl("exit")
  assert.equal(invocation.name, "plan-exit")
  assert.equal(parseExitIntent(invocation.text), "keep")
})

test("discard is a separate explicit /plan-exit discard invocation", () => {
  const invocation = commandForControl("discard")
  assert.equal(invocation.name, "plan-exit")
  assert.equal(parseExitIntent(invocation.text), "discard")
  assert.notDeepEqual(invocation, commandForControl("exit"))
})

test("chrome shows enter off plan mode and open+exit+discard while planning", () => {
  assert.deepEqual(planChromeControls(false), ["enter"])
  assert.ok(!planChromeControls(false).includes("open"))
  assert.deepEqual(planChromeControls(true), ["open", "exit", "discard"])
})

test("open control is labeled Open plan", () => {
  assert.equal(controlLabel("open"), "Open plan")
})

test("research plan mode follows the live session agent and [PLAN] title", () => {
  assert.equal(isResearchPlanMode({ agent: "plan", title: "Work" }), true)
  assert.equal(isResearchPlanMode({ agent: "build", title: "[PLAN] Work" }), true)
  assert.equal(isResearchPlanMode({ agent: "build", title: "Work" }), false)
  assert.equal(isResearchPlanMode(undefined), false)
})

test("hiding the plan panel is not exit and is not discard", () => {
  assert.equal(panelCloseExitsPlanMode(), false)
})

test("successful chrome enter opens the Plan panel after command success", async () => {
  const order: string[] = []
  const opened: string[] = []
  await runPlanSessionControl("enter", "ses_1", {
    runCommand: async (input) => {
      order.push("command")
      assert.deepEqual(input, { sessionID: "ses_1", name: "plan", text: "" })
    },
    openPlanPanel: (name) => {
      order.push("open")
      opened.push(name)
    },
  })
  assert.deepEqual(order, ["command", "open"])
  assert.deepEqual(opened, [PLAN_PANEL_NAME])
})

test("failed chrome enter does not open the Plan panel", async () => {
  const opened: string[] = []
  await assert.rejects(
    () =>
      runPlanSessionControl("enter", "ses_1", {
        runCommand: async () => {
          throw new Error("command failed")
        },
        openPlanPanel: (name) => {
          opened.push(name)
        },
      }),
    /command failed/,
  )
  assert.deepEqual(opened, [])
})

test("non-enter chrome controls do not open the Plan panel", async () => {
  const opened: string[] = []
  const commanded: string[] = []
  await runPlanSessionControl("exit", "ses_1", {
    runCommand: async (input) => {
      commanded.push(input.name)
    },
    openPlanPanel: (name) => {
      opened.push(name)
    },
  })
  await runPlanSessionControl("discard", "ses_1", {
    runCommand: async (input) => {
      commanded.push(`${input.name}:${input.text}`)
    },
    openPlanPanel: (name) => {
      opened.push(name)
    },
  })
  await Promise.resolve()
  assert.deepEqual(commanded, ["plan-exit", "plan-exit:discard"])
  assert.deepEqual(opened, [])
})

test("enter-then-open helper does not encode a typed /plan slash path", () => {
  const source = readFileSync(join(root, "src/tui-controls.ts"), "utf8")
  assert.match(source, /runPlanSessionControl/)
  assert.doesNotMatch(source, /["'`]\/plan["'`]/)
})

test("TUI panel Close calls panel.close and does not run plan-exit", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  assert.match(source, /panel\.close\(\)/)
  assert.match(source, /session\.command/)
  assert.match(source, /runPlanSessionControl/)
  const closeChunk = source.slice(source.indexOf("Close") - 120, source.indexOf("Close") + 40)
  assert.doesNotMatch(closeChunk, /plan-exit|discard/)
  assert.match(source, /PlanPanelFooter/)
})

test("TUI opens the registered plan panel from chrome and palette", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  assert.match(source, /panel\.open\(/)
  assert.match(source, /PLAN_PANEL_NAME/)
  assert.match(source, /plan-mode\.open-panel/)
})

test("composer chrome does not register approve or reject keymap ids", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  const composer = source.slice(source.indexOf("function PlanComposerChrome"), source.indexOf("function PlanPanelFooter"))
  assert.doesNotMatch(composer, /plan-approve|plan-reject|commandForGate/)
})

test("plan panel footer confirms reject, stays inert in-flight, and disables approve on drift", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  const footer = source.slice(source.indexOf("function PlanPanelFooter"))
  assert.match(footer, /rejectRequiresConfirm/)
  assert.match(footer, /onCancelReject/)
  assert.match(footer, /setBusy\(true\)/)
  assert.match(footer, /approveDrifted/)
  assert.match(footer, /commandForGate/)
  assert.doesNotMatch(footer.slice(footer.indexOf("onCancelReject"), footer.indexOf("onCancelReject") + 80), /runGate|commandForGate/)
})
