import assert from "node:assert/strict"
import { test } from "node:test"
import { nextEnterPlanState } from "../src/plan-mode.ts"
import type { SessionPlanState } from "../src/state.ts"

const approved: SessionPlanState = {
  phase: "approved",
  sessionID: "ses_test",
  previousAgent: "build",
  planPath: "/tmp/plan.md",
  contentHash: "old",
  approvedHash: "identity",
}

test("nextEnterPlanState keeps approval instead of re-entering planning", () => {
  const decision = nextEnterPlanState({
    existing: approved,
    sessionID: "ses_test",
    sessionAgent: "build",
    sessionTitle: "Ship search",
    planPath: "/tmp/plan.md",
    contentHash: "new-file-hash",
    resumed: true,
    created: false,
  })
  assert.equal(decision.alreadyOn, true)
  assert.equal(decision.applyPlanning, false)
  assert.equal(decision.state.phase, "approved")
  assert.equal(decision.state.approvedHash, "identity")
  assert.equal(decision.state.contentHash, "new-file-hash")
  assert.match(decision.status, /already approved/)
})

test("nextEnterPlanState still refreshes a planning session", () => {
  const decision = nextEnterPlanState({
    existing: { ...approved, phase: "planning", approvedHash: undefined },
    sessionID: "ses_test",
    planPath: "/tmp/plan.md",
    contentHash: "hash",
    resumed: true,
    created: false,
  })
  assert.equal(decision.alreadyOn, true)
  assert.equal(decision.applyPlanning, true)
  assert.equal(decision.state.phase, "planning")
  assert.equal(decision.state.approvedHash, undefined)
})

test("nextEnterPlanState enters planning from idle", () => {
  const decision = nextEnterPlanState({
    existing: undefined,
    sessionID: "ses_new",
    sessionAgent: "build",
    sessionTitle: "Work",
    planPath: "/tmp/new.md",
    contentHash: "hash",
    resumed: false,
    created: true,
  })
  assert.equal(decision.alreadyOn, false)
  assert.equal(decision.applyPlanning, true)
  assert.equal(decision.state.phase, "planning")
  assert.equal(decision.state.approvedHash, undefined)
  assert.equal(decision.state.previousAgent, "build")
})
