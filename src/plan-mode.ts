import { unlink } from "node:fs/promises"
import type { Plugin } from "@opencode/plugin"
import { contentHash, ensurePlanFile, readPlanFile, showPlanMessage } from "./artifact.ts"
import { planArtifactPath, researchOnlyRules } from "./permissions.ts"
import {
  clearState,
  hasPlanSession,
  isApproved,
  isPlanning,
  loadState,
  patchContentHash,
  saveState,
  type SessionPlanState,
} from "./state.ts"
import {
  alreadyOnStatus,
  enterStatus,
  exitStatus,
  idleStatus,
  PLAN_TITLE_PREFIX,
  parseExitIntent,
  withPlanTitle,
  withoutPlanTitle,
  type ExitIntent,
} from "./status.ts"

type Ctx = Plugin.Context

async function discardDraft(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== "ENOENT") throw error
  }
}

export async function applyPlanningSession(
  ctx: Ctx,
  sessionID: string,
  title: string | undefined,
): Promise<void> {
  await ctx.session.switchAgent({ sessionID, agent: "plan" })
  await ctx.session.update({
    sessionID,
    title: withPlanTitle(title),
    permissions: researchOnlyRules(),
  })
}

export async function enterPlanMode(
  ctx: Ctx,
  sessionID: string,
): Promise<{ state: SessionPlanState; alreadyOn: boolean; resumed: boolean }> {
  const session = await ctx.session.get({ sessionID })
  const existing = await loadState(ctx.storage, sessionID)
  const planPath = existing?.planPath ?? planArtifactPath(sessionID)
  const ensured = await ensurePlanFile(planPath)
  const hash = contentHash(ensured.markdown)
  const resumed = !ensured.created

  if (isPlanning(existing)) {
    const state: SessionPlanState = {
      ...existing,
      planPath,
      phase: "planning",
      contentHash: hash,
      approvedHash: undefined,
    }
    await applyPlanningSession(ctx, sessionID, session.title)
    await saveState(ctx.storage, state)
    await ctx.session.synthetic({ sessionID, text: alreadyOnStatus(planPath) })
    return { state, alreadyOn: true, resumed }
  }

  const previousAgent =
    existing?.previousAgent ??
    (session.agent && session.agent !== "plan" ? session.agent : "build")
  const previousTitle = session.title?.startsWith(PLAN_TITLE_PREFIX)
    ? (existing?.previousTitle ?? withoutPlanTitle(session.title))
    : (existing?.previousTitle ?? session.title)

  const state: SessionPlanState = {
    phase: "planning",
    sessionID,
    previousAgent,
    previousTitle,
    planPath,
    contentHash: hash,
    approvedHash: undefined,
  }

  await applyPlanningSession(ctx, sessionID, session.title)
  await saveState(ctx.storage, state)
  await ctx.session.synthetic({
    sessionID,
    text: enterStatus({ planPath, resumed, created: ensured.created }),
  })
  return { state, alreadyOn: false, resumed }
}

export async function showPlanArtifact(ctx: Ctx, sessionID: string): Promise<void> {
  const existing = await loadState(ctx.storage, sessionID)
  const planPath = existing?.planPath ?? planArtifactPath(sessionID)
  const doc = await readPlanFile(planPath)
  if (!doc) {
    await ctx.session.synthetic({
      sessionID,
      text: `No plan artifact at ${planPath}. Use /plan to create the structured skeleton, then edit it before approve.`,
    })
    return
  }
  if (existing) {
    await patchContentHash(ctx.storage, sessionID, contentHash(doc.markdown))
  }
  await ctx.session.synthetic({ sessionID, text: showPlanMessage(planPath, doc) })
}

export async function exitPlanMode(
  ctx: Ctx,
  sessionID: string,
  rawArgs: string | undefined,
): Promise<void> {
  const intent: ExitIntent = parseExitIntent(rawArgs)
  const session = await ctx.session.get({ sessionID })
  const existing = await loadState(ctx.storage, sessionID)
  const planPath = existing?.planPath ?? planArtifactPath(sessionID)

  if (!hasPlanSession(existing) || !existing) {
    if (intent === "discard") {
      await discardDraft(planPath)
      if (existing) await clearState(ctx.storage, sessionID)
      await ctx.session.synthetic({
        sessionID,
        text: `Plan mode was already off. Discarded draft at ${planPath} if it existed.`,
      })
      return
    }
    await ctx.session.synthetic({ sessionID, text: idleStatus() })
    return
  }

  if (!isApproved(existing)) {
    const agent = existing.previousAgent || "build"
    const title = withoutPlanTitle(session.title, existing.previousTitle)
    await ctx.session.switchAgent({ sessionID, agent })
    await ctx.session.update({
      sessionID,
      ...(title !== undefined ? { title } : {}),
      permissions: [],
    })
  }

  const wasApproved = isApproved(existing)

  if (intent === "discard") {
    await discardDraft(planPath)
    await clearState(ctx.storage, sessionID)
  } else {
    await saveState(ctx.storage, { ...existing, phase: "idle", approvedHash: undefined })
  }

  await ctx.session.synthetic({
    sessionID,
    text: exitStatus({ intent, planPath, wasApproved }),
  })
}

export async function togglePlanMode(
  ctx: Ctx,
  sessionID: string,
  rawArgs: string | undefined,
): Promise<"entered" | "exited"> {
  const existing = await loadState(ctx.storage, sessionID)
  // Approved counts as "on": otherwise `/plan-mode` after `/plan-approve` re-enters planning.
  if (hasPlanSession(existing) || parseExitIntent(rawArgs) === "discard") {
    await exitPlanMode(ctx, sessionID, rawArgs)
    return "exited"
  }
  await enterPlanMode(ctx, sessionID)
  return "entered"
}
