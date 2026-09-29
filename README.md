# opencode-plan-mode

OpenCode 2 plugin: Cursor-like plan mode (draft a plan, gate edits until approved, then execute).

This package loads as plugin id `plan-mode` on OpenCode **2.0.18**. This revision executes against the approved plan as the source of truth (stacked on the approve / reject gate).

## Plan mode toggle

OpenCode has no first-class mode type. This plugin’s toggle is commands plus the built-in `plan` agent:

| Command | Behavior |
| --- | --- |
| `/plan` | Enter Plan mode (research only). Extra arguments are submitted as the research prompt. |
| `/plan-mode` | Toggle. Turning it **off** keeps the draft unless you pass `discard`. |
| `/plan-exit` | Exit **without approving**. Default **keep** the draft. `/plan-exit discard` deletes it. |
| `/plan-show` | Reprint the current artifact and derived checklist in the session. |
| `/plan-approve` | Approve the artifact, unlock implementation tools, and follow that file. Extra args are optional notes. |
| `/plan-execute` | Execute the **approved** plan. Extra args are optional notes. Hard-refuses if Goal / Research / step text / Notes drifted. |
| `/plan-reject` | Reject or revise. Stay in Plan mode; extra args are feedback. No project changes. |
| `/plan-revise` | Alias of `/plan-reject`. |

While Plan mode is on (not yet approved):

- Status is posted in the session and the title is prefixed with `[PLAN] `.
- The session switches to the built-in `plan` agent.
- Project `edit`/`write`/`patch`, `shell`, and Code Mode `execute` are denied. Read/glob/grep/web stay available.
- The agent may write only the plan artifact.

### Approve / reject

| Action | Tools | Artifact |
| --- | --- | --- |
| `/plan-approve` | Unlocked (`build` agent, session deny rules cleared). Agent is prompted to implement **only** this file. Identity SHA-256 stored as `approvedHash`. | Kept. Source of truth for implementation. |
| `/plan-execute` | Re-prompts the `build` agent to continue the approved file. Refuses (does not prompt) if plan **content** drifted. | Kept. Checkbox progress is allowed. |
| `/plan-reject` or `/plan-revise` | Stay locked (research only). If the plan was already approved, tools are locked again. | Kept. Agent updates it when feedback is passed. |
| `/plan-exit` or `/plan-mode` | Unlocked without implementing. | **Kept** on disk. Re-enter with `/plan` to resume. |
| `/plan-exit discard` or `/plan-mode discard` | Unlocked without implementing. | **Discarded** (file deleted). |

OpenCode 2.0.18 has no native Approve button. These commands are the gate.

### Execute against the approved plan

After approve, the artifact is the source of truth:

- The agent must step through the Steps checklist in order and call `plan.progress` (`plan_progress`) after each finished item.
- Stay on-plan. Ask the user before large deviations (new scope, skipped steps, or a different approach).
- **Checkbox progress** (`[ ]` → `[x]`) does **not** invalidate approval.
- Edits to Goal, Research, step **text**, or Notes after approve **do** invalidate it. `/plan-execute` hard-refuses; mutating project tools are denied until `/plan-approve` or `/plan-reject`.

## Plan artifact (source of truth)

The plan is a markdown file, not chat text:

```text
~/.opencode/plan/<sessionID>.md
```

`/plan` creates a skeleton if the file is missing. The user can edit it in any editor **before approve**. The plugin re-reads the file on every model call, so user edits win over earlier chat.

### Sections

```markdown
# Plan title

> Source of truth for this session. Edit this file before approve. ...

## Goal

## Research

## Steps

- [ ] First concrete step
- [x] Done step

## Notes
```

Steps under `## Steps` are parsed into a checklist (todos). `/plan-show` and the planning system prompt include that checklist.

### Agent tools

| Tool | Role |
| --- | --- |
| `plan.read` (`plan_read`) | Load the latest file from disk. |
| `plan.write` (`plan_write`) | Update Goal / Research / Steps / Notes while planning (omit a field to keep it). |
| `plan.progress` (`plan_progress`) | After approve, mark a 1-based checklist step done or reopened. Does not change step text. |

The built-in `write` / `edit` tools can still change this file while planning; project files stay blocked.

## How OpenCode surfaces it

OpenCode 2.0.18 has **no plan sidebar or in-app plan editor**. This plugin surfaces the artifact as:

1. **File on disk** — open `~/.opencode/plan/<sessionID>.md` and edit sections/steps directly.
2. **`/plan-show`** — posts the current markdown plus checklist as a synthetic session message.
3. **Prompt attachment** — while Plan mode is on, user prompts attach `plan.md` so the file appears in the session UI.
4. **System context** — each model call injects the latest file contents and derived checklist. That is what the agent must follow.
5. **Status + `[PLAN]` title** — enter/exit messages include the path.

A native TUI panel would need a separate `@opencode/plugin/tui` plugin (out of scope here).

## Load locally

```sh
npm install
```

OpenCode 2.0.18 requires a **directory** path, not a `.ts` file:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./src"]
}
```

Then:

```sh
opencode service restart
opencode plugin list
```

`plan-mode` should be **active**. Use `/plan` or `/plan-mode` in a session, then `/plan-show` after the artifact exists. `/plan-approve` / `/plan-reject` are the explicit gate; `/plan-execute` continues an approved plan.

Parse/render, gate, and execute tests (optional):

```sh
npx tsx --test test/artifact.test.ts test/gate.test.ts test/execute.test.ts
```

### Manual E2E (Grok)

See `TEST-GROK.md` for a full Grok 4.5 run on OpenCode 2.0.18 (plan → approve → execute).

Invoke slash commands from the TUI or `POST /api/session/{id}/command`. A plain `opencode run "/plan …"` message may **not** enter Plan mode (the text is treated as chat, not a command).

See `NOTES.md` for OpenCode API limits (what this plugin cannot gate).

Manual E2E with Grok (2026-09-28): see `TEST-GROK.md` (plan → approve → execute worked; first-pass blockers fixed in prompts).
