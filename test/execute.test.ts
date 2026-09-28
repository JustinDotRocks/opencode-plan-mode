import assert from "node:assert/strict"
import { test } from "node:test"
import { identityHash, parsePlan, renderPlan } from "../src/artifact.ts"
import { applyApprovedProgress, isIdentityDrifted } from "../src/execute.ts"
import { hashesMatch } from "../src/gate.ts"
import type { SessionPlanState } from "../src/state.ts"
import {
  approvedImplementPrompt,
  approvedInstructions,
  executeDriftStatus,
  executeNotApprovedStatus,
  executeStatus,
  progressDeniedStatus,
} from "../src/status.ts"

function sampleDoc(done = false) {
  return parsePlan(
    renderPlan({
      title: "Ship search",
      goal: "Add search.",
      research: "Index exists.",
      steps: [
        { text: "Wire API", done },
        { text: "Add tests", done: false },
      ],
      notes: "No UI yet.",
    }),
  )
}

function approvedState(overrides: Partial<SessionPlanState> = {}): SessionPlanState {
  const doc = sampleDoc()
  return {
    phase: "approved",
    sessionID: "ses_test",
    previousAgent: "build",
    planPath: "/tmp/plan.md",
    contentHash: "abc",
    approvedHash: identityHash(doc),
    ...overrides,
  }
}

test("isIdentityDrifted is false for checkbox progress and true for step text edits", () => {
  const open = sampleDoc(false)
  const hash = identityHash(open)
  assert.equal(isIdentityDrifted(hash, open.markdown), false)
  assert.equal(isIdentityDrifted(hash, sampleDoc(true).markdown), false)
  const drifted = renderPlan({
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    steps: [
      { text: "Rewrite everything", done: false },
      { text: "Add tests", done: false },
    ],
    notes: "No UI yet.",
  })
  assert.equal(isIdentityDrifted(hash, drifted), true)
  assert.equal(hashesMatch(hash, sampleDoc(true).markdown), true)
})

test("applyApprovedProgress marks a step without changing identity", () => {
  const doc = sampleDoc()
  const state = approvedState()
  const result = applyApprovedProgress({ state, doc, index: 1, done: true })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.match(result.content, /Marked step 1 done: Wire API/)
  assert.match(result.content, /1\/2 done/)
  assert.equal(isIdentityDrifted(state.approvedHash, result.markdown), false)
  const parsed = parsePlan(result.markdown)
  assert.equal(parsed.steps[0]?.done, true)
  assert.equal(parsed.steps[1]?.done, false)
})

test("applyApprovedProgress refuses planning, drift, and bad indexes", () => {
  const doc = sampleDoc()
  const planning: SessionPlanState = { ...approvedState(), phase: "planning", approvedHash: undefined }
  assert.equal(applyApprovedProgress({ state: planning, doc, index: 1, done: true }).ok, false)
  assert.match(applyApprovedProgress({ state: planning, doc, index: 1, done: true }).content, /plan_progress/)
  assert.equal(applyApprovedProgress({ state: undefined, doc, index: 1, done: true }).content, progressDeniedStatus())

  const drifted = approvedState()
  const changed = parsePlan(
    renderPlan({
      title: "Ship search",
      goal: "Different goal.",
      research: "Index exists.",
      steps: [
        { text: "Wire API", done: false },
        { text: "Add tests", done: false },
      ],
      notes: "No UI yet.",
    }),
  )
  const refuse = applyApprovedProgress({ state: drifted, doc: changed, index: 1, done: true })
  assert.equal(refuse.ok, false)
  assert.match(refuse.content, /EXECUTE REFUSED/)

  const bad = applyApprovedProgress({ state: approvedState(), doc, index: 9, done: true })
  assert.equal(bad.ok, false)
  assert.match(bad.content, /No step 9/)
})

test("execute status copy describes refuse, continue, and on-plan rules", () => {
  assert.match(executeNotApprovedStatus(), /\/plan-approve/)
  assert.match(
    executeDriftStatus({ planPath: "/tmp/plan.md", approvedHash: "aa", currentHash: "bb" }),
    /EXECUTE REFUSED/,
  )
  assert.match(executeStatus({ planPath: "/tmp/plan.md", remaining: 1, total: 2 }), /1\/2 done/)
  const prompt = approvedImplementPrompt({
    planPath: "/tmp/plan.md",
    doc: sampleDoc(),
    hash: "abc",
    notes: "",
  })
  assert.match(prompt, /plan_progress/)
  assert.match(prompt, /large deviations/)
  assert.match(prompt, /Next incomplete steps/)
  assert.match(approvedInstructions("/tmp/plan.md"), /Stay on-plan/)
})
