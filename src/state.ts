export type PlanPhase = "idle" | "planning" | "approved"

export type SessionPlanState = {
  phase: PlanPhase
  sessionID: string
  previousAgent: string
  previousTitle?: string
  planPath: string
  /** SHA-256 of the artifact on disk. Refresh when the user or agent edits it. */
  contentHash?: string
  /** SHA-256 of the artifact at approve time. Cleared on reject / re-enter. */
  approvedHash?: string
}

const live = new Map<string, SessionPlanState>()

export function storageKey(sessionID: string): string {
  return `session:${sessionID}`
}

export function isPlanning(state: SessionPlanState | undefined): boolean {
  return state?.phase === "planning"
}

export function isApproved(state: SessionPlanState | undefined): boolean {
  return state?.phase === "approved"
}

/** Planning or approved — a plan session exists (not idle). */
export function hasPlanSession(state: SessionPlanState | undefined): boolean {
  return state?.phase === "planning" || state?.phase === "approved"
}

export function parseSessionState(sessionID: string, value: unknown): SessionPlanState | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  if (record.phase !== "idle" && record.phase !== "planning" && record.phase !== "approved") {
    return undefined
  }
  if (typeof record.planPath !== "string" || record.planPath.length === 0) return undefined
  return {
    phase: record.phase,
    sessionID: typeof record.sessionID === "string" ? record.sessionID : sessionID,
    previousAgent: typeof record.previousAgent === "string" ? record.previousAgent : "build",
    previousTitle: typeof record.previousTitle === "string" ? record.previousTitle : undefined,
    planPath: record.planPath,
    contentHash: typeof record.contentHash === "string" ? record.contentHash : undefined,
    approvedHash: typeof record.approvedHash === "string" ? record.approvedHash : undefined,
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
  const parsed = parseSessionState(sessionID, await storage.get(storageKey(sessionID)))
  if (parsed && parsed.phase !== "idle") live.set(sessionID, parsed)
  return parsed
}

export async function saveState(storage: StorageLike, state: SessionPlanState): Promise<void> {
  if (state.phase === "idle") live.delete(state.sessionID)
  else live.set(state.sessionID, state)
  await storage.set(storageKey(state.sessionID), state)
}

/** Hash-only update. Re-reads live state so a concurrent approve/reject is not reverted. */
export async function patchContentHash(
  storage: StorageLike,
  sessionID: string,
  hash: string,
): Promise<SessionPlanState | undefined> {
  const latest = await loadState(storage, sessionID)
  if (!latest || !hasPlanSession(latest)) return latest
  if (latest.contentHash === hash) return latest
  const next = { ...latest, contentHash: hash }
  await saveState(storage, next)
  return next
}

export async function clearState(storage: StorageLike, sessionID: string): Promise<void> {
  live.delete(sessionID)
  await storage.remove(storageKey(sessionID))
}

export function resetLiveState(): void {
  live.clear()
}

export function liveCacheSize(): number {
  return live.size
}
