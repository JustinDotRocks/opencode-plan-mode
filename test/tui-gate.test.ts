import assert from "node:assert/strict"
import { test } from "node:test"
import { driftDenyMessage } from "../src/status.ts"
import {
  approveDrifted,
  approveEnabled,
  commandForGate,
  commandPayloadText,
  driftLockMessage,
  gateControlLabel,
  hasPendingPlan,
  isDriftRelockCopy,
  panelGateControls,
  panelGateVisible,
  rejectConfirmPrompt,
  rejectEnabled,
  rejectRequiresConfirm,
} from "../src/tui-gate.ts"

test("gate commands are existing /plan-approve and /plan-reject with no extra args", () => {
  assert.deepEqual(commandForGate("approve"), { name: "plan-approve", text: "" })
  assert.deepEqual(commandForGate("reject"), { name: "plan-reject", text: "" })
})

test("footer labels", () => {
  assert.equal(gateControlLabel("approve"), "Approve")
  assert.equal(gateControlLabel("reject"), "Reject/revise")
})

test("footer actions only while research plan mode is active (pending plan)", () => {
  assert.equal(hasPendingPlan({ agent: "plan", title: "Work" }), true)
  assert.equal(hasPendingPlan({ agent: "build", title: "[PLAN] Work" }), true)
  assert.equal(hasPendingPlan({ agent: "build", title: "Work" }), false)
  assert.equal(panelGateVisible({ agent: "plan", title: "Work" }), true)
  assert.equal(panelGateVisible({ agent: "build", title: "[PLAN] Work" }), true)
  assert.equal(panelGateVisible({ agent: "build", title: "Work" }), false)
  assert.equal(panelGateVisible(undefined), false)
  assert.deepEqual(panelGateControls(true), ["approve", "reject"])
  assert.deepEqual(panelGateControls(false), [])
})

test("reject requires confirm; cancel is not an API call", () => {
  assert.equal(rejectRequiresConfirm(), true)
  assert.match(rejectConfirmPrompt(), /Cancel does not call the API/)
})

test("identity-hash drift disables approve and reuses existing re-lock copy", () => {
  assert.equal(approveEnabled({ visible: true, drifted: false, busy: false }), true)
  assert.equal(approveEnabled({ visible: true, drifted: true, busy: false }), false)
  assert.equal(approveEnabled({ visible: false, drifted: false, busy: false }), false)
  assert.equal(approveEnabled({ visible: true, drifted: false, busy: true }), false)
  const path = "/tmp/plan.md"
  assert.equal(driftLockMessage(path), driftDenyMessage(path))
  assert.equal(isDriftRelockCopy(driftDenyMessage(path)), true)
  assert.equal(approveDrifted({ payload: driftDenyMessage(path) }), true)
  assert.equal(approveDrifted({ approvedHash: "aa", currentHash: "bb" }), true)
  assert.equal(approveDrifted({ approvedHash: "aa", currentHash: "aa" }), false)
  assert.equal(approveDrifted({}), false)
  assert.equal(commandPayloadText({ text: driftDenyMessage(path) }), driftDenyMessage(path))
  assert.equal(commandPayloadText(new Error(driftDenyMessage(path))), driftDenyMessage(path))
})

test("reject stays enabled during drift so the user can revise; busy disables both", () => {
  assert.equal(rejectEnabled({ visible: true, busy: false }), true)
  assert.equal(rejectEnabled({ visible: true, busy: true }), false)
  assert.equal(rejectEnabled({ visible: false, busy: false }), false)
})
