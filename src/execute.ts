import { pathToFileURL } from "node:url"
import type { Plugin } from "@opencode/plugin"
import {
  applyStepDoneToMarkdown,
  contentHash,
  identityHash,
  parsePlan,
  readPlanFile,
  remainingSteps,
  type PlanDocument,
} from "./artifact.ts"
import { hashesMatch, unlockForBuild } from "./gate.ts"
import { hasPlanSession, isApproved, loadState, saveState, type SessionPlanState } from "./state.ts"
import {
  approvedImplementPrompt,
  driftDenyMessage,
  executeDriftStatus,
  executeNotApprovedStatus,
  executeStatus,
  missingArtifactStatus,
  progressDeniedStatus,
  progressMessage,
} from "./status.ts"

type Ctx = Plugin.Context

export function isIdentityDrifted(approvedHash: string | undefined, markdown: string): boolean {
  return !hashesMatch(approvedHash, markdown)
}

export async function approvedWorkBlocked(
  state: SessionPlanState | undefined,
): Promise<{ blocked: boolean; message?: string }> {
  if (!isApproved(state) || !state) return { blocked: false }
  const doc = await readPlanFile(state.planPath)
  if (!doc) {
    return { blocked: true, message: missingArtifactStatus(state.planPath) }
  }
  if (isIdentityDrifted(state.approvedHash, doc.markdown)) {
    return { blocked: true, message: driftDenyMessage(state.planPath) }
  }
  return { blocked: false }
}

export function applyApprovedProgress(input: {
  state: SessionPlanState | undefined
  doc: PlanDocument | undefined
  index: number
  done: boolean
}): { ok: false; content: string } | { ok: true; markdown: string; content: string } {
  const { state, doc, index, done } = input
  if (!isApproved(state) || !state) {
    return { ok: false, content: progressDeniedStatus() }
  }
  if (!doc) {
    return { ok: false, content: missingArtifactStatus(state.planPath) }
  }
  if (isIdentityDrifted(state.approvedHash, doc.markdown)) {
    return {
      ok: false,
      content: executeDriftStatus({
        planPath: state.planPath,
        approvedHash: state.approvedHash ?? "(missing)",
        currentHash: identityHash(doc),
      }),
    }
  }
  const markdown = applyStepDoneToMarkdown(doc.markdown, index, done)
  if (!markdown) {
    return {
      ok: false,
      content: `No step ${index}. This plan has ${doc.steps.length} step${doc.steps.length === 1 ? "" : "s"}.`,
    }
  }
  const written = parsePlan(markdown)
  const updated = written.steps[index - 1]
  return {
    ok: true,
    markdown,
    content: progressMessage({
      index,
      done,
      text: updated?.text ?? doc.steps[index - 1]?.text ?? "",
      doc: written,
    }),
  }
}

function planFileRef(planPath: string): { uri: string; name: string; description: string } {
  return {
    uri: pathToFileURL(planPath).href,
    name: "plan.md",
    description: "Approved plan artifact (source of truth). Follow this document.",
  }
}

export async function executePlan(ctx: Ctx, sessionID: string, rawArgs: string | undefined): Promise<void> {
  const existing = await loadState(ctx.storage, sessionID)
  if (!hasPlanSession(existing) || !existing) {
    await ctx.session.synthetic({ sessionID, text: executeNotApprovedStatus() })
    return
  }
  if (!isApproved(existing)) {
    await ctx.session.synthetic({ sessionID, text: executeNotApprovedStatus() })
    return
  }

  const doc = await readPlanFile(existing.planPath)
  if (!doc) {
    await ctx.session.synthetic({ sessionID, text: missingArtifactStatus(existing.planPath) })
    return
  }

  if (isIdentityDrifted(existing.approvedHash, doc.markdown)) {
    await ctx.session.synthetic({
      sessionID,
      text: executeDriftStatus({
        planPath: existing.planPath,
        approvedHash: existing.approvedHash ?? "(missing)",
        currentHash: identityHash(doc),
      }),
    })
    return
  }

  const notes = (rawArgs ?? "").trim()
  const remaining = remainingSteps(doc).length
  await unlockForBuild(ctx, sessionID, existing)
  await saveState(ctx.storage, {
    ...existing,
    contentHash: contentHash(doc.markdown),
  })
  await ctx.session.synthetic({
    sessionID,
    text: executeStatus({
      planPath: existing.planPath,
      remaining,
      total: doc.steps.length,
    }),
  })
  await ctx.session.prompt({
    sessionID,
    text: approvedImplementPrompt({
      planPath: existing.planPath,
      doc,
      hash: existing.approvedHash ?? identityHash(doc),
      notes,
    }),
    files: [planFileRef(existing.planPath)],
  })
}
