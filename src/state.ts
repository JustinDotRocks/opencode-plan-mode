export type PlanPhase = "idle" | "planning"

export type SessionPlanState = {
  phase: PlanPhase
  sessionID: string
  previousAgent: string
  previousTitle?: string
  planPath: string
}

const live = new Map<string, SessionPlanState>()

export function storageKey(sessionID: string): string {
  return `session:${sessionID}`
}

export function isPlanning(state: SessionPlanState | undefined): boolean {
  return state?.phase === "planning"
}

function parseState(sessionID: string, value: unknown): SessionPlanState | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  if (record.phase !== "idle" && record.phase !== "planning") return undefined
  if (typeof record.planPath !== "string" || record.planPath.length === 0) return undefined
  return {
    phase: record.phase,
    sessionID: typeof record.sessionID === "string" ? record.sessionID : sessionID,
    previousAgent: typeof record.previousAgent === "string" ? record.previousAgent : "build",
    previousTitle: typeof record.previousTitle === "string" ? record.previousTitle : undefined,
    planPath: record.planPath,
  }
}

export type StorageLike = {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

export async function loadState(
  storage: StorageLike,
  sessionID: string,
): Promise<SessionPlanState | undefined> {
  const cached = live.get(sessionID)
  if (cached) return cached
  const parsed = parseState(sessionID, await storage.get(storageKey(sessionID)))
  if (parsed) live.set(sessionID, parsed)
  return parsed
}

export async function saveState(storage: StorageLike, state: SessionPlanState): Promise<void> {
  live.set(state.sessionID, state)
  await storage.set(storageKey(state.sessionID), state)
}

export async function clearState(storage: StorageLike, sessionID: string): Promise<void> {
  live.delete(sessionID)
  await storage.remove(storageKey(sessionID))
}
