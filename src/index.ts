import { pathToFileURL } from "node:url"
import { Plugin } from "@opencode/plugin"
import { contentHash, readPlanFile, sourceOfTruthBlock } from "./artifact.ts"
import { enterPlanMode, exitPlanMode, showPlanArtifact, togglePlanMode } from "./plan-mode.ts"
import { registerPlanTools } from "./plan-tools.ts"
import {
  MUTATING_FILE_TOOLS,
  shouldDenyPlanningEdit,
  toolInputPaths,
} from "./permissions.ts"
import { isPlanning, loadState, saveState } from "./state.ts"
import { researchInstructions } from "./status.ts"

export default Plugin.define({
  id: "plan-mode",
  async setup(ctx) {
    await ctx.storage.set("loaded", true)
    await registerPlanTools(ctx)

    await ctx.command.transform((editor) => {
      editor.add({
        name: "plan",
        description: "Enter Plan mode (research only; does not implement)",
        execute: async ({ sessionID, prompt, delivery }) => {
          await enterPlanMode(ctx, sessionID)
          const extra = prompt.text.trim()
          if (!extra) return
          await ctx.session.prompt({
            sessionID,
            text: extra,
            files: prompt.files,
            agents: prompt.agents,
            skills: prompt.skills,
            delivery,
          })
        },
      })

      editor.add({
        name: "plan-mode",
        description: "Toggle Plan mode. Exit keeps the draft unless you pass discard.",
        execute: async ({ sessionID, prompt }) => {
          await togglePlanMode(ctx, sessionID, prompt.text)
        },
      })

      editor.add({
        name: "plan-exit",
        description: "Exit Plan mode without approving. Keeps the draft; pass discard to delete it.",
        execute: async ({ sessionID, prompt }) => {
          await exitPlanMode(ctx, sessionID, prompt.text)
        },
      })

      editor.add({
        name: "plan-show",
        description: "Show the current plan artifact (source of truth) and derived checklist",
        execute: async ({ sessionID }) => {
          await showPlanArtifact(ctx, sessionID)
        },
      })
    })

    await ctx.session.hook("context", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (!isPlanning(state)) return
      event.system.push({
        type: "text",
        text: researchInstructions(state.planPath),
      })
      const doc = await readPlanFile(state.planPath)
      if (!doc) return
      const hash = contentHash(doc.markdown)
      if (state.contentHash !== hash) {
        await saveState(ctx.storage, { ...state, contentHash: hash })
      }
      event.system.push({
        type: "text",
        text: sourceOfTruthBlock(state.planPath, doc),
      })
    })

    await ctx.session.hook("prompt", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (!isPlanning(state)) return
      const doc = await readPlanFile(state.planPath)
      if (!doc) return
      const uri = pathToFileURL(state.planPath).href
      event.prompt.files ??= []
      if (event.prompt.files.some((file) => file.uri === uri)) return
      event.prompt.files.push({
        uri,
        name: "plan.md",
        description: "Session plan artifact (source of truth). Edit before approve.",
      })
    })

    await ctx.permission.hook("evaluate", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (!isPlanning(state)) return

      if (event.action === "shell" || event.action === "execute") {
        event.effect = "deny"
        event.message = "Plan mode is ON (research only). Shell and Code Mode are blocked until you /plan-exit."
        return
      }

      if (event.action === "edit" && shouldDenyPlanningEdit(event.resources, event.sessionID)) {
        event.effect = "deny"
        event.message = `Plan mode is ON (research only). Project edits are blocked. Write the plan at ${state.planPath}.`
      }
    })

    await ctx.tool.hook("execute.before", async (event) => {
      if (!MUTATING_FILE_TOOLS.has(event.tool)) return
      const state = await loadState(ctx.storage, event.sessionID)
      if (!isPlanning(state)) return
      const paths = toolInputPaths(event.input)
      if (shouldDenyPlanningEdit(paths, event.sessionID)) {
        throw new Error(
          `Plan mode is ON (research only). Cannot ${event.tool} project files. Write the plan at ${state.planPath}.`,
        )
      }
    })
  },
})


