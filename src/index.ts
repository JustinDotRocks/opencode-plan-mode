import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "plan-mode",
  async setup(ctx) {
    await ctx.storage.set("loaded", true)

    await ctx.command.transform((editor) => {
      editor.add({
        name: "plan-mode",
        description: "Confirm the plan-mode plugin loaded (stub)",
        execute: async ({ sessionID }) => {
          await ctx.session.synthetic({
            sessionID,
            text: "Plan mode plugin loaded.",
          })
        },
      })
    })
  },
})
