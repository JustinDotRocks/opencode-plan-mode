import { access, unlink } from "node:fs/promises"
import { constants } from "node:fs"
import type { Plugin } from "@opencode/plugin"
import { planArtifactPath, researchOnlyRules } from "./permissions.ts"
import {
  clearState,
  isPlanning,
  loadState,
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

async function draftExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function discardDraft(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== "ENOENT") throw error
  }
}

async function applyPlanningSession(ctx: Ctx, sessionID: string, title: string | undefined): Promise<void> {
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
  const resumed = await draftExists(planPath)

  if (isPlanning(existing)) {
    await applyPlanningSession(ctx, sessionID, session.title)
    await saveState(ctx.storage, { ...existing, planPath, phase: "planning" })
    await ctx.session.synthetic({ sessionID, text: alreadyOnStatus(planPath) })
    return { state: existing, alreadyOn: true, resumed }
  }

  const previousAgent =
    session.agent && session.agent !== "plan" ? session.agent : (existing?.previousAgent ?? "build")
  const previousTitle = session.title?.startsWith(PLAN_TITLE_PREFIX)
    ? (existing?.previousTitle ?? withoutPlanTitle(session.title))
    : session.title

  const state: SessionPlanState = {
    phase: "planning",
    sessionID,
    previousAgent,
    previousTitle,
    planPath,
  }

  await applyPlanningSession(ctx, sessionID, session.title)
  await saveState(ctx.storage, state)
  await ctx.session.synthetic({
    sessionID,
    text: enterStatus({ planPath, resumed }),
  })
  return { state, alreadyOn: false, resumed }
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

  if (!isPlanning(existing)) {
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

  const agent = existing.previousAgent || "build"
  const title = withoutPlanTitle(session.title, existing.previousTitle)
  await ctx.session.switchAgent({ sessionID, agent })
  await ctx.session.update({
    sessionID,
    ...(title !== undefined ? { title } : {}),
    permissions: [],
  })

  if (intent === "discard") {
    await discardDraft(planPath)
    await clearState(ctx.storage, sessionID)
  } else {
    await saveState(ctx.storage, { ...existing, phase: "idle" })
  }

  await ctx.session.synthetic({
    sessionID,
    text: exitStatus({ intent, planPath }),
  })
}

export async function togglePlanMode(
  ctx: Ctx,
  sessionID: string,
  rawArgs: string | undefined,
): Promise<"entered" | "exited"> {
  const existing = await loadState(ctx.storage, sessionID)
  if (isPlanning(existing) || parseExitIntent(rawArgs) === "discard") {
    await exitPlanMode(ctx, sessionID, rawArgs)
    return "exited"
  }
  await enterPlanMode(ctx, sessionID)
  return "entered"
}
