import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { parseExitIntent } from "../src/status.ts"
import {
  commandForControl,
  isResearchPlanMode,
  panelCloseExitsPlanMode,
  planChromeControls,
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

test("chrome shows enter off plan mode and exit+discard while planning", () => {
  assert.deepEqual(planChromeControls(false), ["enter"])
  assert.deepEqual(planChromeControls(true), ["exit", "discard"])
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

test("TUI panel Close calls panel.close and does not run plan-exit", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  assert.match(source, /panel\.close\(\)/)
  assert.match(source, /session\.command/)
  assert.match(source, /commandForControl/)
  const closeChunk = source.slice(source.indexOf("Close") - 120, source.indexOf("Close") + 40)
  assert.doesNotMatch(closeChunk, /plan-exit|discard/)
  assert.match(source, /PlanPanelFooter/)
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
