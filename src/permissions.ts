import { homedir } from "node:os"
import { join, resolve } from "node:path"

export type PermissionRule = {
  action: string
  resource: string
  effect: "allow" | "deny" | "ask"
}

export const MUTATING_FILE_TOOLS = new Set(["write", "edit", "patch"])

export function toPosix(path: string): string {
  return path.replaceAll("\\", "/")
}

export function planDir(): string {
  return join(homedir(), ".opencode", "plan")
}

export function planArtifactPath(sessionID: string): string {
  const safe = sessionID.replaceAll(/[^A-Za-z0-9._-]/g, "_")
  return join(planDir(), `${safe}.md`)
}

export function planDirPosix(): string {
  return toPosix(planDir())
}

/** Session rules applied after the built-in `plan` agent policy. Last match wins. */
export function researchOnlyRules(): PermissionRule[] {
  const dir = planDirPosix()
  return [
    { action: "edit", resource: "*", effect: "deny" },
    { action: "edit", resource: `${dir}/*`, effect: "allow" },
    { action: "edit", resource: `${dir}/**`, effect: "allow" },
    { action: "shell", resource: "*", effect: "deny" },
    { action: "execute", resource: "*", effect: "deny" },
  ]
}

/** Expand a leading `~` so tilde paths resolve against the home directory. */
export function expandUserPath(filePath: string): string {
  if (filePath === "~") return homedir()
  if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
    return join(homedir(), filePath.slice(2))
  }
  return filePath
}

/**
 * True when `filePath` is the plan directory or a file inside it, after
 * resolving `.` / `..` (and `~`). A string prefix check is not enough:
 * `~/.opencode/plan/../../../.ssh/id_rsa` must not count as in-bounds.
 */
export function isPlanArtifactPath(filePath: string, _sessionID: string): boolean {
  const normalized = toPosix(resolve(expandUserPath(filePath)))
  const dir = toPosix(resolve(planDir()))
  if (normalized === dir) return true
  if (normalized.startsWith(`${dir}/`)) return true
  return false
}

export function toolInputPaths(input: unknown): string[] {
  if (!input || typeof input !== "object") return []
  const record = input as Record<string, unknown>
  const paths: string[] = []
  for (const key of ["path", "filePath", "file", "target"]) {
    if (typeof record[key] === "string") paths.push(record[key])
  }
  if (Array.isArray(record.files)) {
    for (const file of record.files) {
      if (typeof file === "string") paths.push(file)
      else if (file && typeof file === "object" && typeof (file as { path?: unknown }).path === "string") {
        paths.push((file as { path: string }).path)
      }
    }
  }
  return paths
}

export function shouldDenyPlanningEdit(resources: readonly string[], sessionID: string): boolean {
  if (resources.length === 0) return true
  return resources.some((resource) => !isPlanArtifactPath(resource, sessionID))
}
