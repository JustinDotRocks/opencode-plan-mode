import assert from "node:assert/strict"
import { test } from "node:test"
import { enterPlanOnStart } from "../src/tui-enter-start.ts"

test("enterPlanOnStart creates, runs /plan with empty text, then navigates", async () => {
  const order: string[] = []
  const sessionID = await enterPlanOnStart({
    createSession: async () => {
      order.push("create")
      return "ses_1"
    },
    runCommand: async (input) => {
      order.push("command")
      assert.deepEqual(input, { sessionID: "ses_1", name: "plan", text: "" })
    },
    navigateToSession: (id) => {
      order.push("navigate")
      assert.equal(id, "ses_1")
    },
    openPlanPanel: (name) => {
      order.push("open")
      assert.equal(name, "plan-mode.plan")
    },
  })
  assert.equal(sessionID, "ses_1")
  assert.deepEqual(order, ["create", "command", "navigate", "open"])
})

test("enterPlanOnStart does not command or navigate when create throws", async () => {
  const order: string[] = []
  await assert.rejects(
    () =>
      enterPlanOnStart({
        createSession: async () => {
          order.push("create")
          throw new Error("create failed")
        },
        runCommand: async () => {
          order.push("command")
        },
        navigateToSession: () => {
          order.push("navigate")
        },
        openPlanPanel: () => {
          order.push("open")
        },
      }),
    /create failed/,
  )
  assert.deepEqual(order, ["create"])
})

test("enterPlanOnStart does not navigate when command throws", async () => {
  const order: string[] = []
  await assert.rejects(
    () =>
      enterPlanOnStart({
        createSession: async () => {
          order.push("create")
          return "ses_1"
        },
        runCommand: async () => {
          order.push("command")
          throw new Error("command failed")
        },
        navigateToSession: () => {
          order.push("navigate")
        },
        openPlanPanel: () => {
          order.push("open")
        },
      }),
    /command failed/,
  )
  assert.deepEqual(order, ["create", "command"])
})
