import { pathToFileURL } from "node:url"
import type { Plugin } from "@opencode/plugin"
import { contentHash, identityHash, identityHashFromMarkdown, readPlanFile, type PlanDocument } from "./artifact.ts"
import { applyPlanningSession } from "./plan-mode.ts"
import { hasPlanSession, isApproved, loadState, saveState, type SessionPlanState } from "./state.ts"
import {
  alreadyApprovedStatus,
  approveStatus,
  approvedImplementPrompt,
  gateIdleStatus,
  missingArtifactStatus,
  rejectStatus,
  revisePrompt,
  withoutPlanTitle,
} from "./status.ts"

type Ctx = Plugin.Context

/** True when Goal/Research/step text/Notes match. Checklist progress is ignored. */
export function hashesMatch(approvedHash: string | undefined, markdown: string): boolean {
  return approvedHash !== undefined && approvedHash === identityHashFromMarkdown(markdown)
}

export function gateIdleReason(state: SessionPlanState | undefined): string | undefined {
  if (!hasPlanSession(state)) return gateIdleStatus()
  return undefined
}

function planFileRef(planPath: string, description: string): { uri: string; name: string; description: string } {
  return {
    uri: pathToFileURL(planPath).href,
    name: "plan.md",
    description,
  }
}

export async function unlockForBuild(ctx: Ctx, sessionID: string, state: SessionPlanState): Promise<void> {
  const session = await ctx.session.get({ sessionID })
  const agent = state.previousAgent || "build"
  const title = withoutPlanTitle(session.title, state.previousTitle)
  await ctx.session.switchAgent({ sessionID, agent })
  await ctx.session.update({
    sessionID,
    ...(title !== undefined ? { title } : {}),
    permissions: [],
  })
}

export async function approvePlan(ctx: Ctx, sessionID: string, rawArgs: string | undefined): Promise<void> {
  const existing = await loadState(ctx.storage, sessionID)
  const idle = gateIdleReason(existing)
  if (idle || !existing) {
    await ctx.session.synthetic({ sessionID, text: idle ?? gateIdleStatus() })
    return
  }

  const doc = await readPlanFile(existing.planPath)
  if (!doc) {
    await ctx.session.synthetic({ sessionID, text: missingArtifactStatus(existing.planPath) })
    return
  }

  const hash = identityHash(doc)
  const notes = (rawArgs ?? "").trim()

  if (isApproved(existing) && hashesMatch(existing.approvedHash, doc.markdown) && !notes) {
    await ctx.session.synthetic({ sessionID, text: alreadyApprovedStatus(existing.planPath, hash) })
    return
  }

  await unlockForBuild(ctx, sessionID, existing)
  const state: SessionPlanState = {
    ...existing,
    phase: "approved",
    contentHash: contentHash(doc.markdown),
    approvedHash: hash,
  }
  await saveState(ctx.storage, state)
  await ctx.session.synthetic({
    sessionID,
    text: approveStatus({ planPath: existing.planPath, hash }),
  })
  await ctx.session.prompt({
    sessionID,
    text: approvedImplementPrompt({ planPath: existing.planPath, doc, hash, notes }),
    files: [planFileRef(existing.planPath, "Approved plan artifact (source of truth). Follow this document.")],
  })
}

export async function rejectPlan(ctx: Ctx, sessionID: string, rawArgs: string | undefined): Promise<void> {
  const existing = await loadState(ctx.storage, sessionID)
  const idle = gateIdleReason(existing)
  if (idle || !existing) {
    await ctx.session.synthetic({ sessionID, text: idle ?? gateIdleStatus() })
    return
  }

  const session = await ctx.session.get({ sessionID })
  const feedback = (rawArgs ?? "").trim()
  const fromApproved = isApproved(existing)

  await applyPlanningSession(ctx, sessionID, session.title)
  const state: SessionPlanState = {
    ...existing,
    phase: "planning",
    approvedHash: undefined,
  }
  await saveState(ctx.storage, state)
  await ctx.session.synthetic({
    sessionID,
    text: rejectStatus({ planPath: existing.planPath, fromApproved, hasFeedback: feedback.length > 0 }),
  })

  if (!feedback) return
  await ctx.session.prompt({
    sessionID,
    text: revisePrompt({ planPath: existing.planPath, feedback }),
    files: [planFileRef(existing.planPath, "Plan artifact to revise. Do not edit the project.")],
  })
}

export function approvedContextNote(
  planPath: string,
  doc: PlanDocument,
  approvedHash: string | undefined,
): string {
  const current = identityHash(doc)
  const stale = approvedHash !== undefined && current !== approvedHash
  const lines = [
    "The plan was approved. Implementation tools are unlocked.",
    "Follow the approved plan artifact. Step through the checklist; mark progress with plan.progress / plan_progress. Ask before large deviations. Do not expand scope.",
    `Path: ${planPath}`,
    `Approved identity SHA-256: ${approvedHash ?? "(missing)"}`,
  ]
  if (stale) {
    lines.push(
      `The approved plan content changed (identity SHA-256 ${current}). Checkbox progress is allowed; Goal, Research, step text, and Notes are not. Stop implementing. Ask the user to /plan-approve again or /plan-reject.`,
    )
  }
  return lines.join(" ")
}
