import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  contentHash,
  deriveTodos,
  ensurePlanFile,
  formatChecklist,
  identityHash,
  mergePlan,
  parsePlan,
  remainingSteps,
  renderPlan,
  setStepDone,
  writePlanFile,
} from "../src/artifact.ts"

test("parsePlan reads sections and checklist steps", () => {
  const markdown = [
    "# Ship search",
    "",
    "## Goal",
    "",
    "Add search.",
    "",
    "## Research",
    "",
    "Index exists.",
    "",
    "## Steps",
    "",
    "- [ ] Wire API",
    "- [x] Add tests",
    "",
    "## Notes",
    "",
    "No UI yet.",
    "",
  ].join("\n")
  const doc = parsePlan(markdown)
  assert.equal(doc.title, "Ship search")
  assert.equal(doc.goal, "Add search.")
  assert.equal(doc.research, "Index exists.")
  assert.equal(doc.notes, "No UI yet.")
  assert.deepEqual(doc.steps, [
    { text: "Wire API", done: false },
    { text: "Add tests", done: true },
  ])
})

test("renderPlan round-trips structured fields", () => {
  const rendered = renderPlan({
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    steps: [
      { text: "Wire API", done: false },
      { text: "Add tests", done: true },
    ],
    notes: "No UI yet.",
  })
  const doc = parsePlan(rendered)
  assert.equal(doc.title, "Ship search")
  assert.equal(doc.goal, "Add search.")
  assert.deepEqual(doc.steps, [
    { text: "Wire API", done: false },
    { text: "Add tests", done: true },
  ])
  assert.match(rendered, /Source of truth for this session/)
})

test("identityHash ignores checklist progress but not step text", () => {
  const base = {
    title: "Ship search",
    goal: "Add search.",
    research: "Index exists.",
    notes: "No UI yet.",
  }
  const open = parsePlan(renderPlan({ ...base, steps: [{ text: "Wire API", done: false }] }))
  const done = parsePlan(renderPlan({ ...base, steps: [{ text: "Wire API", done: true }] }))
  const other = parsePlan(renderPlan({ ...base, steps: [{ text: "Different", done: false }] }))
  assert.equal(identityHash(open), identityHash(done))
  assert.notEqual(identityHash(open), identityHash(other))
  assert.deepEqual(remainingSteps(done), [])
  assert.deepEqual(setStepDone(open.steps, 1, true), [{ text: "Wire API", done: true }])
  assert.equal(setStepDone(open.steps, 2, true), undefined)
})

test("identityHash does not treat empty sections as skeleton placeholders", () => {
  const empty = {
    title: "",
    goal: "",
    research: "",
    steps: [] as { text: string; done: boolean }[],
    notes: "",
  }
  const placeholders = {
    title: "Plan",
    goal: "Describe the outcome.",
    research: "Findings that justify the steps.",
    steps: [] as { text: string; done: boolean }[],
    notes: "Risks, out of scope, open questions.",
  }
  assert.notEqual(identityHash(empty), identityHash(placeholders))
})

test("deriveTodos and mergePlan keep user edits unless patched", () => {
  const existing = parsePlan(
    renderPlan({
      title: "A",
      goal: "G",
      research: "R",
      steps: [{ text: "One", done: false }],
      notes: "N",
    }),
  )
  const merged = mergePlan(existing, { goal: "G2" })
  assert.equal(merged.title, "A")
  assert.equal(merged.goal, "G2")
  assert.deepEqual(merged.steps, [{ text: "One", done: false }])
  assert.deepEqual(deriveTodos(existing), ["- [ ] One"])
  assert.match(formatChecklist(existing), /0\/1 done/)
})

test("ensurePlanFile creates a skeleton once and keeps user edits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "plan-artifact-"))
  const path = join(dir, "session.md")
  try {
    const first = await ensurePlanFile(path, "Demo")
    assert.equal(first.created, true)
    assert.equal(first.doc.title, "Demo")
    assert.ok(first.doc.steps.length >= 1)
    await writePlanFile(
      path,
      renderPlan({
        title: "Demo",
        goal: "User edited goal",
        research: "User research",
        steps: [{ text: "User step", done: false }],
        notes: "User notes",
      }),
    )
    const second = await ensurePlanFile(path, "Demo")
    assert.equal(second.created, false)
    assert.equal(parsePlan(second.markdown).goal, "User edited goal")
    assert.equal(contentHash(second.markdown).length, 64)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
