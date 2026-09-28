import type { Plugin } from "@opencode/plugin"
import {
  contentHash,
  mergePlan,
  parsePlan,
  readPlanFile,
  renderPlan,
  writePlanFile,
  type PlanStep,
} from "./artifact.ts"
import { applyApprovedProgress } from "./execute.ts"
import { planArtifactPath } from "./permissions.ts"
import { isApproved, isPlanning, loadState, saveState } from "./state.ts"

type Ctx = Plugin.Context

const stepSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Checklist item the user can edit" },
    done: { type: "boolean", description: "Whether this step is complete" },
  },
  required: ["text"],
  additionalProperties: false,
} as const

function asSteps(value: unknown): PlanStep[] | undefined {
  if (!Array.isArray(value)) return undefined
  const steps: PlanStep[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const record = item as { text?: unknown; done?: unknown }
    if (typeof record.text !== "string" || record.text.trim().length === 0) continue
    steps.push({ text: record.text.trim(), done: record.done === true })
  }
  return steps
}

async function planPathFor(ctx: Ctx, sessionID: string): Promise<string> {
  const state = await loadState(ctx.storage, sessionID)
  return state?.planPath ?? planArtifactPath(sessionID)
}

async function rememberHash(ctx: Ctx, sessionID: string, markdown: string): Promise<void> {
  const state = await loadState(ctx.storage, sessionID)
  if (!state) return
  const hash = contentHash(markdown)
  if (state.contentHash === hash) return
  await saveState(ctx.storage, { ...state, contentHash: hash })
}

export async function registerPlanTools(ctx: Ctx): Promise<void> {
  await ctx.tool.transform((editor) => {
    editor.namespace({
      name: "plan",
      description: "Read and write the session plan artifact (source of truth)",
    })

    editor.add({
      name: "read",
      description:
        "Read the session plan artifact. This file is the source of truth; the user may have edited it.",
      options: { namespace: "plan" },
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async (_input, context) => {
        const path = await planPathFor(ctx, context.sessionID)
        const doc = await readPlanFile(path)
        if (!doc) {
          return {
            content: `No plan artifact at ${path}. Enter Plan mode with /plan to create the skeleton, then fill it in.`,
          }
        }
        await rememberHash(ctx, context.sessionID, doc.markdown)
        return {
          content: [
            `Path: ${path}`,
            `Title: ${doc.title}`,
            `Steps: ${doc.steps.length}`,
            "",
            doc.markdown.trimEnd(),
          ].join("\n"),
        }
      },
    })

    editor.add({
      name: "write",
      description:
        "Write the structured plan artifact (Goal, Research, Steps checklist, Notes). Omit a field to keep the current value. The user can edit the same file before approve.",
      options: { namespace: "plan" },
      input: {
        type: "object",
        properties: {
          title: { type: "string", description: "Plan title (H1)" },
          goal: { type: "string", description: "Goal section" },
          research: { type: "string", description: "Research section" },
          steps: {
            type: "array",
            description: "Checklist steps derived for todos",
            items: stepSchema,
          },
          notes: { type: "string", description: "Notes section" },
        },
        additionalProperties: false,
      },
      execute: async (input, context) => {
        const state = await loadState(ctx.storage, context.sessionID)
        if (isApproved(state)) {
          return {
            content:
              "The plan is approved. Use plan_progress to mark checklist steps. To change Goal, Research, step text, or Notes, /plan-reject first (or ask the user before a large deviation).",
          }
        }
        if (!isPlanning(state)) {
          return {
            content:
              "Plan mode is not ON. Use /plan before writing the artifact. The file is the source of truth only while planning.",
          }
        }
        const path = state.planPath
        const existing = await readPlanFile(path)
        const record = (input ?? {}) as Record<string, unknown>
        const merged = mergePlan(existing, {
          title: typeof record.title === "string" ? record.title : undefined,
          goal: typeof record.goal === "string" ? record.goal : undefined,
          research: typeof record.research === "string" ? record.research : undefined,
          steps: asSteps(record.steps),
          notes: typeof record.notes === "string" ? record.notes : undefined,
        })
        const markdown = renderPlan(merged)
        await writePlanFile(path, markdown)
        await rememberHash(ctx, context.sessionID, markdown)
        const written = parsePlan(markdown)
        return {
          content: [
            `Updated plan artifact at ${path}`,
            `Title: ${written.title}`,
            `Steps: ${written.steps.length}`,
            "The user can edit this file before approve. Re-read it; do not trust chat-only notes.",
            "",
            markdown.trimEnd(),
          ].join("\n"),
        }
      },
    })

    editor.add({
      name: "progress",
      description:
        "Mark an approved plan step done or not done. Does not change step text. Stay on-plan; ask the user before large deviations.",
      options: { namespace: "plan" },
      input: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description: "1-based index in the Steps checklist",
            minimum: 1,
          },
          done: {
            type: "boolean",
            description: "true to complete (default), false to reopen",
          },
        },
        required: ["index"],
        additionalProperties: false,
      },
      execute: async (input, context) => {
        const state = await loadState(ctx.storage, context.sessionID)
        const path = state?.planPath ?? (await planPathFor(ctx, context.sessionID))
        const doc = await readPlanFile(path)
        const record = (input ?? {}) as { index?: unknown; done?: unknown }
        const index = typeof record.index === "number" ? record.index : Number.NaN
        const done = record.done !== false
        const result = applyApprovedProgress({ state, doc, index, done })
        if (!result.ok) return { content: result.content }
        await writePlanFile(path, result.markdown)
        await rememberHash(ctx, context.sessionID, result.markdown)
        return { content: result.content }
      },
    })
  })
}
