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

test("TUI module registers the plan-mode.plan session.panel shell", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  assert.match(source, /id:\s*"plan-mode\.tui"/)
  assert.match(source, /append:\s*"session\.panel"/)
  assert.match(source, /PLAN_PANEL_NAME/)
  assert.match(source, /PlanPanelFooter/)
  assert.match(source, /plan-approve|commandForGate/)
  assert.doesNotMatch(source, /readPlanFile/)
})

test("plugin setup shows Enter plan on the start-screen footer and registers the palette command", () => {
  const source = readFileSync(join(root, "src/tui.tsx"), "utf8")
  const setup = source.slice(source.indexOf("setup(context)"))
  assert.match(setup, /append:\s*"prompt\.footer\.status"/)
  assert.match(setup, /!input\.sessionID/)
  assert.match(setup, /id:\s*"plan-mode\.enter"/)
  assert.match(setup, /enterPlanOnStart/)
})
