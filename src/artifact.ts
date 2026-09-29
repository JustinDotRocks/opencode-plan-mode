import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type PlanStep = {
  text: string
  done: boolean
}

export type PlanDocument = {
  title: string
  goal: string
  research: string
  steps: PlanStep[]
  notes: string
  markdown: string
}

export type PlanPatch = {
  title?: string
  goal?: string
  research?: string
  steps?: PlanStep[]
  notes?: string
}

export const SOURCE_OF_TRUTH_NOTE =
  "Source of truth for this session. Edit this file before approve. The agent must follow this document, not chat-only notes."

const TITLE_HEADING = /^#\s+(.+?)\s*$/
const SECTION_HEADING = /^##\s+(.+?)\s*$/
const STEP_LINE = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/

export function skeletonMarkdown(title = "Plan"): string {
  return renderPlan({
    title,
    goal: "Describe the outcome.",
    research: "Findings that justify the steps.",
    steps: [
      { text: "First concrete step", done: false },
      { text: "Second concrete step", done: false },
    ],
    notes: "Risks, out of scope, open questions.",
  })
}

export function parsePlan(markdown: string): PlanDocument {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n")
  let title = "Plan"
  let seenTitle = false
  const sections = new Map<string, string[]>()
  let current: string | undefined

  for (const line of lines) {
    const heading = SECTION_HEADING.exec(line)
    if (heading) {
      current = heading[1].trim().toLowerCase()
      if (!sections.has(current)) sections.set(current, [])
      continue
    }
    if (!current && !seenTitle) {
      const titleMatch = TITLE_HEADING.exec(line)
      if (titleMatch) {
        title = titleMatch[1].trim() || "Plan"
        seenTitle = true
        continue
      }
    }
    if (!current) continue
    sections.get(current)!.push(line)
  }

  return {
    title,
    goal: trimSection(sections.get("goal") ?? []),
    research: trimSection(sections.get("research") ?? []),
    steps: parseSteps(sections.get("steps") ?? []),
    notes: trimSection(sections.get("notes") ?? []),
    markdown,
  }
}

export function parseSteps(lines: readonly string[]): PlanStep[] {
  const steps: PlanStep[] = []
  for (const line of lines) {
    const match = STEP_LINE.exec(line)
    if (!match) continue
    const text = match[2].trim()
    if (!text) continue
    steps.push({ text, done: match[1] !== " " })
  }
  return steps
}

export function renderPlan(doc: Omit<PlanDocument, "markdown">): string {
  const steps =
    doc.steps.length > 0
      ? doc.steps.map((step) => `- [${step.done ? "x" : " "}] ${step.text}`).join("\n")
      : "- [ ] "
  return [
    `# ${doc.title.trim() || "Plan"}`,
    "",
    `> ${SOURCE_OF_TRUTH_NOTE}`,
    "",
    "## Goal",
    "",
    doc.goal.trim() || "Describe the outcome.",
    "",
    "## Research",
    "",
    doc.research.trim() || "Findings that justify the steps.",
    "",
    "## Steps",
    "",
    steps,
    "",
    "## Notes",
    "",
    doc.notes.trim() || "Risks, out of scope, open questions.",
    "",
  ].join("\n")
}

export function mergePlan(existing: PlanDocument | undefined, patch: PlanPatch): Omit<PlanDocument, "markdown"> {
  return {
    title: patch.title?.trim() || existing?.title || "Plan",
    goal: patch.goal ?? existing?.goal ?? "",
    research: patch.research ?? existing?.research ?? "",
    steps: patch.steps ?? existing?.steps ?? [],
    notes: patch.notes ?? existing?.notes ?? "",
  }
}

export function deriveTodos(doc: Pick<PlanDocument, "steps">): string[] {
  return doc.steps.map((step) => `- [${step.done ? "x" : " "}] ${step.text}`)
}

export function formatChecklist(doc: Pick<PlanDocument, "steps">): string {
  if (doc.steps.length === 0) return "Checklist: (no steps yet)"
  const done = doc.steps.filter((step) => step.done).length
  return [`Checklist (${done}/${doc.steps.length} done):`, ...deriveTodos(doc)].join("\n")
}

export function contentHash(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex")
}

export async function readPlanFile(path: string): Promise<PlanDocument | undefined> {
  try {
    const markdown = await readFile(path, "utf8")
    return parsePlan(markdown)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === "ENOENT") return undefined
    throw error
  }
}

export async function writePlanFile(path: string, markdown: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, markdown, "utf8")
}

export async function ensurePlanFile(
  path: string,
  title?: string,
): Promise<{ created: boolean; markdown: string; doc: PlanDocument }> {
  const existing = await readPlanFile(path)
  if (existing) return { created: false, markdown: existing.markdown, doc: existing }
  const markdown = skeletonMarkdown(title)
  await writePlanFile(path, markdown)
  return { created: true, markdown, doc: parsePlan(markdown) }
}

export function sourceOfTruthBlock(
  path: string,
  doc: PlanDocument,
  options?: { approved?: boolean },
): string {
  const editLine = options?.approved
    ? "This snapshot was approved. If the user edits the file, ask them to /plan-approve again or /plan-reject."
    : "The user may edit this file in their editor at any time before approve. Re-read it before proposing changes."
  const toolsLine = options?.approved
    ? "Follow this file. Do not treat chat-only notes as a replacement."
    : "Use plan_read / plan_write to load or update Goal, Research, Steps, and Notes."
  return [
    "The plan artifact is the source of truth for this session. Follow the file, not chat-only notes.",
    `Path: ${path}`,
    editLine,
    toolsLine,
    formatChecklist(doc),
    "",
    "----- plan artifact -----",
    doc.markdown.trimEnd(),
    "----- end plan artifact -----",
  ].join("\n")
}

export function showPlanMessage(path: string, doc: PlanDocument): string {
  return [
    `Plan artifact (source of truth): ${path}`,
    "Edit this file in your editor before approve, or ask the agent to update it with plan_write.",
    "OpenCode has no plan sidebar; this file plus /plan-show is how the plan is surfaced.",
    "",
    formatChecklist(doc),
    "",
    doc.markdown.trimEnd(),
  ].join("\n")
}

function trimSection(lines: string[]): string {
  return lines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "")
}
