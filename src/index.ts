import { pathToFileURL } from "node:url"
import { Plugin } from "@opencode/plugin"
import { contentHash, readPlanFile, sourceOfTruthBlock } from "./artifact.ts"
import { approvedWorkBlocked, executePlan } from "./execute.ts"
import { approvePlan, approvedContextNote, rejectPlan } from "./gate.ts"
import { enterPlanMode, exitPlanMode, showPlanArtifact, togglePlanMode } from "./plan-mode.ts"
import { registerPlanTools } from "./plan-tools.ts"
import {
  MUTATING_FILE_TOOLS,
  shouldDenyPlanningEdit,
  toolInputPaths,
} from "./permissions.ts"
import { hasPlanSession, isApproved, isPlanning, loadState, saveState } from "./state.ts"
import { approvedInstructions, researchInstructions } from "./status.ts"

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

      editor.add({
        name: "plan-approve",
        description: "Approve the plan artifact, unlock implementation tools, and follow that file",
        execute: async ({ sessionID, prompt }) => {
          await approvePlan(ctx, sessionID, prompt.text)
        },
      })

      editor.add({
        name: "plan-execute",
        description:
          "Execute the approved plan (source of truth). Refuses if Goal/Research/step text/Notes drifted.",
        execute: async ({ sessionID, prompt }) => {
          await executePlan(ctx, sessionID, prompt.text)
        },
      })

      editor.add({
        name: "plan-reject",
        description: "Reject or revise the plan. Stay in Plan mode; extra args are feedback.",
        execute: async ({ sessionID, prompt }) => {
          await rejectPlan(ctx, sessionID, prompt.text)
        },
      })

      editor.add({
        name: "plan-revise",
        description: "Revise the plan (alias of /plan-reject). Stay in Plan mode; extra args are feedback.",
        execute: async ({ sessionID, prompt }) => {
          await rejectPlan(ctx, sessionID, prompt.text)
        },
      })
    })

    await ctx.session.hook("context", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (!hasPlanSession(state) || !state) return
      const doc = await readPlanFile(state.planPath)
      if (doc) {
        const hash = contentHash(doc.markdown)
        if (state.contentHash !== hash) {
          await saveState(ctx.storage, { ...state, contentHash: hash })
        }
      }

      if (isPlanning(state)) {
        event.system.push({
          type: "text",
          text: researchInstructions(state.planPath),
        })
      } else if (isApproved(state)) {
        event.system.push({
          type: "text",
          text: approvedInstructions(state.planPath),
        })
        if (doc) {
          event.system.push({
            type: "text",
            text: approvedContextNote(state.planPath, doc, state.approvedHash),
          })
        }
      }

      if (!doc) return
      event.system.push({
        type: "text",
        text: sourceOfTruthBlock(state.planPath, doc, { approved: isApproved(state) }),
      })
    })

    await ctx.session.hook("prompt", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (!hasPlanSession(state) || !state) return
      const doc = await readPlanFile(state.planPath)
      if (!doc) return
      const uri = pathToFileURL(state.planPath).href
      event.prompt.files ??= []
      if (event.prompt.files.some((file) => file.uri === uri)) return
      event.prompt.files.push({
        uri,
        name: "plan.md",
        description: isApproved(state)
          ? "Approved plan artifact (source of truth)."
          : "Session plan artifact (source of truth). Edit before approve.",
      })
    })

    await ctx.permission.hook("evaluate", async (event) => {
      const state = await loadState(ctx.storage, event.sessionID)
      if (isPlanning(state)) {
        if (event.action === "shell" || event.action === "execute") {
          event.effect = "deny"
          event.message =
            "Plan mode is ON (research only). Shell and Code Mode are blocked until /plan-approve."
          return
        }

        if (event.action === "edit" && shouldDenyPlanningEdit(event.resources, event.sessionID)) {
          event.effect = "deny"
          event.message = `Plan mode is ON (research only). Project edits are blocked until /plan-approve. Write the plan at ${state.planPath}.`
        }
        return
      }

      if (isApproved(state) && state) {
        const blocked = await approvedWorkBlocked(state)
        if (!blocked.blocked) return
        if (event.action === "shell" || event.action === "execute") {
          event.effect = "deny"
          event.message = blocked.message
          return
        }
        if (event.action === "edit" && shouldDenyPlanningEdit(event.resources, event.sessionID)) {
          event.effect = "deny"
          event.message = blocked.message
        }
      }
    })

    await ctx.tool.hook("execute.before", async (event) => {
      if (!MUTATING_FILE_TOOLS.has(event.tool)) return
      const state = await loadState(ctx.storage, event.sessionID)
      const paths = toolInputPaths(event.input)
      if (isPlanning(state) && state) {
        if (shouldDenyPlanningEdit(paths, event.sessionID)) {
          throw new Error(
            `Plan mode is ON (research only). Cannot ${event.tool} project files until /plan-approve. Write the plan at ${state.planPath}.`,
          )
        }
        return
      }
      if (isApproved(state) && state) {
        const blocked = await approvedWorkBlocked(state)
        if (blocked.blocked && shouldDenyPlanningEdit(paths, event.sessionID)) {
          throw new Error(blocked.message ?? `Cannot ${event.tool} until /plan-approve or /plan-reject.`)
        }
      }
    })
  },
})
