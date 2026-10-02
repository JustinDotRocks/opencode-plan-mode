import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("package.json exposes a ./tui export next to the server plugin", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    exports: Record<string, string>
  }
  assert.equal(pkg.exports["."], "./src/index.ts")
  assert.equal(pkg.exports["./tui"], "./src/tui.tsx")
})

test("TUI module registers an empty session.panel shell for plan-mode.plan", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  assert.match(source, /id:\s*"plan-mode\.tui"/)
  assert.match(source, /append:\s*"session\.panel"/)
  assert.match(source, /PLAN_PANEL_NAME = "plan-mode\.plan"/)
  assert.doesNotMatch(source, /plan-show|plan-approve|plan-exit|readPlanFile/)
})
