import assert from "node:assert/strict"
import { test } from "node:test"
import { mergePlan } from "../src/artifact.ts"
import { asSteps } from "../src/plan-tools.ts"

const existing = {
  title: "Ship",
  goal: "G",
  research: "R",
  steps: [{ text: "Keep me", done: false }],
  notes: "N",
  markdown: "",
}

test("asSteps omits a non-empty array of invalid items so mergePlan keeps existing steps", () => {
  assert.equal(asSteps([{}]), undefined)
  assert.equal(asSteps([{ text: "" }]), undefined)
  assert.equal(asSteps([{ text: "   " }, 1, null]), undefined)
  assert.equal(asSteps(["Wire API", "Add tests"]), undefined)
  const merged = mergePlan(existing, { steps: asSteps(["Wire API", "Add tests"]) })
  assert.deepEqual(merged.steps, [{ text: "Keep me", done: false }])
})

test("asSteps treats a real empty array as an intentional empty checklist", () => {
  assert.deepEqual(asSteps([]), [])
  const merged = mergePlan(existing, { steps: asSteps([]) })
  assert.deepEqual(merged.steps, [])
})

test("asSteps keeps valid items and drops invalid ones in a mixed array", () => {
  assert.deepEqual(asSteps([{ text: "One" }, { text: "" }, { text: "Two", done: true }]), [
    { text: "One", done: false },
    { text: "Two", done: true },
  ])
})

test("asSteps returns undefined for non-arrays", () => {
  assert.equal(asSteps(undefined), undefined)
  assert.equal(asSteps("nope"), undefined)
})
