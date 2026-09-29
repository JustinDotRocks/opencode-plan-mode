import assert from "node:assert/strict"
import { test } from "node:test"
import { contentHash, identityHash, parsePlan, renderPlan, sourceOfTruthBlock } from "../src/artifact.ts"
import { approvedContextNote, gateIdleReason, hashesMatch } from "../src/gate.ts"
import {
  parseSessionState,
  isApproved,
  isPlanning,
  hasPlanSession,
  liveCacheSize,
  loadState,
  patchContentHash,
  resetLiveState,
  saveState,
  type SessionPlanState,
  type StorageLike,
} from "../src/state.ts"
import {
  alreadyApprovedStatus,
  approveStatus,
  approvedImplementPrompt,
  gateIdleStatus,
  rejectStatus,
  researchInstructions,
  revisePrompt,
} from "../src/status.ts"

function sampleMarkdown(): string {
  return renderPlan({
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    steps: [{ text: "Wire API", done: false }],
    notes: "No UI yet.",
  })
}

function planningState(overrides: Partial<SessionPlanState> = {}): SessionPlanState {
  return {
    phase: "planning",
    sessionID: "ses_test",
    previousAgent: "build",
    planPath: "/tmp/plan.md",
    contentHash: "abc",
    ...overrides,
  }
}

test("parseSessionState accepts approved phase and approvedHash", () => {
  const parsed = parseSessionState("ses_test", {
    phase: "approved",
    planPath: "/tmp/plan.md",
    previousAgent: "build",
    contentHash: "aa",
    approvedHash: "bb",
  })
  assert.ok(parsed)
  assert.equal(parsed.phase, "approved")
  assert.equal(parsed.approvedHash, "bb")
  assert.equal(isApproved(parsed), true)
  assert.equal(isPlanning(parsed), false)
  assert.equal(hasPlanSession(parsed), true)
})

test("parseSessionState rejects unknown phases", () => {
  assert.equal(parseSessionState("ses_test", { phase: "executing", planPath: "/tmp/x.md" }), undefined)
  assert.equal(parseSessionState("ses_test", { phase: "planning" }), undefined)
})

test("patchContentHash does not revert an approved phase", async () => {
  resetLiveState()
  const store = new Map<string, unknown>()
  const storage: StorageLike = {
    async get(key) {
      return store.get(key)
    },
    async set(key, value) {
      store.set(key, value)
    },
    async remove(key) {
      store.delete(key)
    },
  }
  const sessionID = "ses_race"
  await saveState(storage, {
    phase: "planning",
    sessionID,
    previousAgent: "build",
    planPath: "/tmp/plan.md",
    contentHash: "old",
  })
  await saveState(storage, {
    phase: "approved",
    sessionID,
    previousAgent: "build",
    planPath: "/tmp/plan.md",
    contentHash: "old",
    approvedHash: "id",
  })
  const patched = await patchContentHash(storage, sessionID, "new")
  assert.equal(patched?.phase, "approved")
  assert.equal(patched?.approvedHash, "id")
  assert.equal(patched?.contentHash, "new")
  const loaded = await loadState(storage, sessionID)
  assert.equal(loaded?.phase, "approved")
  resetLiveState()
})

test("idle saves are not kept in the live cache", async () => {
  resetLiveState()
  const store = new Map<string, unknown>()
  const storage: StorageLike = {
    async get(key) {
      return store.get(key)
    },
    async set(key, value) {
      store.set(key, value)
    },
    async remove(key) {
      store.delete(key)
    },
  }
  const sessionID = "ses_idle"
  await saveState(storage, {
    phase: "planning",
    sessionID,
    previousAgent: "build",
    planPath: "/tmp/plan.md",
  })
  assert.equal(liveCacheSize(), 1)
  await saveState(storage, {
    phase: "idle",
    sessionID,
    previousAgent: "build",
    planPath: "/tmp/plan.md",
  })
  assert.equal(liveCacheSize(), 0)
  const loaded = await loadState(storage, sessionID)
  assert.equal(loaded?.phase, "idle")
  assert.equal(liveCacheSize(), 0)
  resetLiveState()
})

test("gateIdleReason blocks idle and missing state", () => {
  assert.equal(gateIdleReason(undefined), gateIdleStatus())
  assert.equal(gateIdleReason(planningState({ phase: "idle" })), gateIdleStatus())
  assert.equal(gateIdleReason(planningState()), undefined)
  assert.equal(gateIdleReason(planningState({ phase: "approved", approvedHash: "x" })), undefined)
})

test("hashesMatch compares identity SHA-256 and ignores checkbox progress", () => {
  const markdown = sampleMarkdown()
  const hash = identityHash(parsePlan(markdown))
  assert.equal(hash.length, 64)
  assert.equal(hashesMatch(hash, markdown), true)
  const progressed = renderPlan({
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    steps: [{ text: "Wire API", done: true }],
    notes: "No UI yet.",
  })
  assert.equal(hashesMatch(hash, progressed), true)
  const drifted = renderPlan({
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    steps: [{ text: "Something else", done: false }],
    notes: "No UI yet.",
  })
  assert.equal(hashesMatch(hash, drifted), false)
  assert.equal(hashesMatch(hash, `${markdown}## Appendix\n\nInjected.\n`), false)
  assert.equal(hashesMatch("deadbeef", markdown), false)
  assert.equal(hashesMatch(undefined, markdown), false)
  assert.equal(contentHash(markdown).length, 64)
})

test("approve and reject status copy describe the gate", () => {
  const approved = approveStatus({ planPath: "/tmp/plan.md", hash: "abc" })
  assert.match(approved, /APPROVED/)
  assert.match(approved, /unlocked/)
  assert.match(alreadyApprovedStatus("/tmp/plan.md", "abc"), /already approved/)

  const rejected = rejectStatus({ planPath: "/tmp/plan.md", fromApproved: false, hasFeedback: true })
  assert.match(rejected, /REJECTED/)
  assert.match(rejected, /artifact only/)
  const fromApproved = rejectStatus({ planPath: "/tmp/plan.md", fromApproved: true, hasFeedback: false })
  assert.match(fromApproved, /locked again/)
})

test("approved implement prompt includes the file and optional notes", () => {
  const markdown = sampleMarkdown()
  const doc = parsePlan(markdown)
  const hash = contentHash(markdown)
  const prompt = approvedImplementPrompt({
    planPath: "/tmp/plan.md",
    doc,
    hash,
    notes: "Keep tests.",
  })
  assert.match(prompt, /Implement ONLY this approved plan/)
  assert.match(prompt, /Keep tests/)
  assert.match(prompt, /Wire API/)
  assert.match(researchInstructions("/tmp/plan.md"), /\/plan-approve/)
})

test("revise prompt forbids project edits", () => {
  const text = revisePrompt({ planPath: "/tmp/plan.md", feedback: "Split step 1." })
  assert.match(text, /Stay in Plan mode/)
  assert.match(text, /Do not edit the project/)
  assert.match(text, /Split step 1/)
})

test("sourceOfTruthBlock distinguishes draft vs approved", () => {
  const doc = parsePlan(sampleMarkdown())
  const draft = sourceOfTruthBlock("/tmp/plan.md", doc)
  const approved = sourceOfTruthBlock("/tmp/plan.md", doc, { approved: true })
  assert.match(draft, /before approve/)
  assert.match(approved, /This snapshot was approved/)
})

test("approvedContextNote warns when plan content drifts, not checkbox progress", () => {
  const markdown = sampleMarkdown()
  const doc = parsePlan(markdown)
  const hash = identityHash(doc)
  const ok = approvedContextNote("/tmp/plan.md", doc, hash)
  assert.match(ok, /approved/)
  assert.doesNotMatch(ok, /content changed/)
  const progressed = parsePlan(
    renderPlan({
      title: "Ship search",
      goal: "Add search.",
      research: "Index exists.",
      steps: [{ text: "Wire API", done: true }],
      notes: "No UI yet.",
    }),
  )
  assert.doesNotMatch(approvedContextNote("/tmp/plan.md", progressed, hash), /content changed/)
  const stale = approvedContextNote("/tmp/plan.md", doc, "not-the-hash")
  assert.match(stale, /content changed/)
  assert.match(stale, /\/plan-approve/)
})
