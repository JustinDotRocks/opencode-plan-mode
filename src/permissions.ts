import { existsSync, realpathSync } from "node:fs"
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

function withTrailingSep(posixPath: string): string {
  return posixPath.endsWith("/") ? posixPath : `${posixPath}/`
}

/**
 * Resolve `filePath` against `cwd` (not `process.cwd()`), then `realpath`
 * when the path exists so the plan dir and the candidate share one base.
 * OpenCode 2.0.18 `edit` uses `path` and, from a home session, permission
 * resources like `.opencode/plan/ses_<id>.md`.
 */
function resolveAgainstBase(filePath: string, cwd: string = homedir()): string {
  const absolute = resolve(cwd, expandUserPath(filePath))
  if (!existsSync(absolute)) return absolute
  try {
    return realpathSync(absolute)
  } catch {
    return absolute
  }
}

/**
 * True when `filePath` is the plan directory or a file inside it, after
 * resolving `.` / `..` (and `~`). Trailing-separator containment on both
 * sides: `~/.opencode/plan/x.md` is in-bounds and `~/.opencode/planner/x.md`
 * is not. `~/.opencode/plan/../../../.ssh/id_rsa` must not count as in-bounds.
 */
export function isPlanArtifactPath(filePath: string, _sessionID: string, cwd: string = homedir()): boolean {
  const file = withTrailingSep(toPosix(resolveAgainstBase(filePath, cwd)))
  const dir = withTrailingSep(toPosix(resolveAgainstBase(planDir(), cwd)))
  return file.startsWith(dir)
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

export function shouldDenyPlanningEdit(
  resources: readonly string[],
  sessionID: string,
  cwd: string = homedir(),
): boolean {
  if (resources.length === 0) return true
  return resources.some((resource) => !isPlanArtifactPath(resource, sessionID, cwd))
}
