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
  alreadyApprovedStatus,
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

export type EnterPlanDecision = {
  state: SessionPlanState
  alreadyOn: boolean
  applyPlanning: boolean
  status: string
}

export function nextEnterPlanState(input: {
  existing: SessionPlanState | undefined
  sessionID: string
  sessionAgent?: string
  sessionTitle?: string
  planPath: string
  contentHash: string
  resumed: boolean
  created: boolean
}): EnterPlanDecision {
  const { existing, sessionID, sessionAgent, sessionTitle, planPath, resumed, created } = input
  const hash = input.contentHash

  if (isApproved(existing) && existing) {
    return {
      state: { ...existing, planPath, contentHash: hash },
      alreadyOn: true,
      applyPlanning: false,
      status: alreadyApprovedStatus(planPath, existing.approvedHash ?? hash),
    }
  }

  if (isPlanning(existing) && existing) {
    return {
      state: {
        ...existing,
        planPath,
        phase: "planning",
        contentHash: hash,
        approvedHash: undefined,
      },
      alreadyOn: true,
      applyPlanning: true,
      status: alreadyOnStatus(planPath),
    }
  }

  const previousAgent =
    existing?.previousAgent ?? (sessionAgent && sessionAgent !== "plan" ? sessionAgent : "build")
  const previousTitle = sessionTitle?.startsWith(PLAN_TITLE_PREFIX)
    ? (existing?.previousTitle ?? withoutPlanTitle(sessionTitle))
    : (existing?.previousTitle ?? sessionTitle)

  return {
    state: {
      phase: "planning",
      sessionID,
      previousAgent,
      previousTitle,
      planPath,
      contentHash: hash,
      approvedHash: undefined,
    },
    alreadyOn: false,
    applyPlanning: true,
    status: enterStatus({ planPath, resumed, created }),
  }
}

export async function enterPlanMode(
  ctx: Ctx,
  sessionID: string,
  options?: { announce?: boolean },
): Promise<{ state: SessionPlanState; alreadyOn: boolean; resumed: boolean }> {
  const session = await ctx.session.get({ sessionID })
  const existing = await loadState(ctx.storage, sessionID)
  const planPath = existing?.planPath ?? planArtifactPath(sessionID)
  const ensured = await ensurePlanFile(planPath)
  const hash = contentHash(ensured.markdown)
  const resumed = !ensured.created
  const decision = nextEnterPlanState({
    existing,
    sessionID,
    sessionAgent: session.agent,
    sessionTitle: session.title,
    planPath,
    contentHash: hash,
    resumed,
    created: ensured.created,
  })

  if (decision.applyPlanning) {
    await applyPlanningSession(ctx, sessionID, session.title)
  }
  await saveState(ctx.storage, decision.state)
  if (options?.announce !== false) {
    await ctx.session.synthetic({ sessionID, text: decision.status })
  }
  return { state: decision.state, alreadyOn: decision.alreadyOn, resumed }
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
