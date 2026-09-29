import assert from "node:assert/strict"
import { homedir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  expandUserPath,
  isPlanArtifactPath,
  planArtifactPath,
  planDir,
  planDirPosix,
  researchOnlyRules,
  shouldDenyPlanningEdit,
  toolInputPaths,
} from "../src/permissions.ts"

const sessionID = "ses_test"

test("isPlanArtifactPath allows the session plan file and plan dir", () => {
  const artifact = planArtifactPath(sessionID)
  assert.equal(isPlanArtifactPath(artifact, sessionID), true)
  assert.equal(isPlanArtifactPath(planDir(), sessionID), true)
  assert.equal(shouldDenyPlanningEdit([artifact], sessionID), false)
})

test("isPlanArtifactPath rejects .. traversal out of the plan directory", () => {
  const escaped = join(planDir(), "..", "..", "..", ".ssh", "id_rsa")
  assert.equal(isPlanArtifactPath(escaped, sessionID), false)
  assert.equal(shouldDenyPlanningEdit([escaped], sessionID), true)
})

test("isPlanArtifactPath rejects tilde paths that traverse out of the plan directory", () => {
  const sneaky = "~/.opencode/plan/../../../.ssh/id_rsa"
  assert.equal(isPlanArtifactPath(sneaky, sessionID), false)
  assert.equal(shouldDenyPlanningEdit([sneaky], sessionID), true)
})

test("isPlanArtifactPath still allows a tilde path that stays in the plan directory", () => {
  const nested = "~/.opencode/plan/ses_test.md"
  assert.equal(expandUserPath(nested), join(homedir(), ".opencode", "plan", "ses_test.md"))
  assert.equal(isPlanArtifactPath(nested, sessionID), true)
})

test("shouldDenyPlanningEdit denies when any listed path is outside the plan dir", () => {
  const artifact = planArtifactPath(sessionID)
  const outside = join(planDir(), "..", "secrets.txt")
  assert.equal(shouldDenyPlanningEdit([artifact, outside], sessionID), true)
})

test("isPlanArtifactPath rejects an ordinary project path", () => {
  const projectFile = join(process.cwd(), "src", "index.ts")
  assert.equal(isPlanArtifactPath(projectFile, sessionID), false)
  assert.equal(shouldDenyPlanningEdit([projectFile], sessionID), true)
})

test("shouldDenyPlanningEdit denies empty resource lists", () => {
  assert.equal(shouldDenyPlanningEdit([], sessionID), true)
})

test("shouldDenyPlanningEdit allows every path when all are in the plan dir", () => {
  const artifact = planArtifactPath(sessionID)
  const nested = join(planDir(), "notes.md")
  assert.equal(shouldDenyPlanningEdit([artifact, nested], sessionID), false)
})

test("toolInputPaths reads path-like fields and files[] entries", () => {
  assert.deepEqual(toolInputPaths(null), [])
  assert.deepEqual(toolInputPaths("src/index.ts"), [])
  assert.deepEqual(toolInputPaths({ path: "/a.md", filePath: "/b.md", file: "/c.md", target: "/d.md" }), [
    "/a.md",
    "/b.md",
    "/c.md",
    "/d.md",
  ])
  assert.deepEqual(
    toolInputPaths({ files: ["/e.md", { path: "/f.md" }, { other: 1 }, 3] }),
    ["/e.md", "/f.md"],
  )
})

test("researchOnlyRules deny project edits/shell/execute and allow the plan dir", () => {
  const dir = planDirPosix()
  const rules = researchOnlyRules()
  assert.deepEqual(rules, [
    { action: "edit", resource: "*", effect: "deny" },
    { action: "edit", resource: `${dir}/*`, effect: "allow" },
    { action: "edit", resource: `${dir}/**`, effect: "allow" },
    { action: "shell", resource: "*", effect: "deny" },
    { action: "execute", resource: "*", effect: "deny" },
  ])
})
