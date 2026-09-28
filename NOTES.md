# OpenCode 2 plan-mode plugin research

Target: **OpenCode 2.0.18**. Research notes plus what this plugin implements.

Official docs:

- [Build plugins](https://opencode.ai/v2/docs/build/plugins/) (Promise API, hooks, transforms)
- [Effect plugins](https://opencode.ai/v2/docs/build/plugins/effect)
- [CLI / TUI plugins](https://opencode.ai/v2/docs/build/plugins/cli)
- [Configure plugins](https://opencode.ai/v2/docs/plugins/)
- [Config `plugins` field](https://opencode.ai/v2/docs/config/)
- [Migrate V1 → V2](https://opencode.ai/v2/docs/build/plugins/migrate-v1)
- [Agents](https://opencode.ai/v2/docs/agents/)
- [Permissions](https://opencode.ai/v2/docs/permissions/)
- [Commands](https://opencode.ai/v2/docs/commands/)
- [Tools](https://opencode.ai/v2/docs/tools/)

---

## 1. Plugin basics

### Default export

V2 loads a **default export** from `Plugin.define`. It must have a stable **`id`** and either **`setup`** (Promise) or **`effect`** (Effect). That is the whole loader contract.

```ts
// Promise — @opencode/plugin
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "plan-mode",
  async setup(ctx) {
    console.log(`loaded in OpenCode ${ctx.app.version}`)
    return () => console.log("unloaded")
  },
})
```

```ts
// Effect — @opencode/plugin/effect
import { Plugin } from "@opencode/plugin/effect"
import { Effect } from "effect"

export default Plugin.define({
  id: "plan-mode",
  effect: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.storage.set("loaded", true)
    }),
})
```

- `id` scopes `ctx.storage` and shows up in plugin status/diagnostics.
- `setup` may return a cleanup function. Hook/transform registrations dispose automatically on unload.
- Effect plugins live in a `Scope`; fibers/finalizers end when the plugin unloads.
- `ctx.options` is the object from `plugins[].options`.
- `ctx.location` is **this plugin instance’s** directory/project, not every session it might see.

V1 plugins (a function that returns a hook object) **do not run** in V2. Port to `Plugin.define` + domain `hook`/`transform`. See [migrate](https://opencode.ai/v2/docs/build/plugins/migrate-v1). Config key is `plugins` (not V1 `plugin`).

### Package layout (published)

```text
opencode-plan-mode/
  package.json
  src/index.ts          # default export Plugin.define
  # optional later:
  src/tui.tsx           # only if we add a TUI panel
```

```json
{
  "name": "opencode-plan-mode",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@opencode/plugin": "latest"
  }
}
```

Pin `@opencode/plugin` to a version compatible with **2.0.18**. Optional `./tui` export is only for [CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli). Server plan-mode does not need it for the first scaffold.

### `opencode.json` entry

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-plan-mode",
    "opencode-plan-mode@0.0.1",
    "./",
    {
      "package": "opencode-plan-mode",
      "options": { "artifactDir": ".opencode/plans" }
    }
  ]
}
```

Relative paths resolve from the config file that contains the entry. Plugin arrays **merge** across global → project → `.opencode` configs (lowest to highest precedence), they do not replace each other. Prefix `-id` or `-wildcard` to disable; `*` matches all.

### Load lifecycle

1. Server starts; cached package plugins load immediately; missing packages install in the background ([configure](https://opencode.ai/v2/docs/plugins/)).
2. Auto-discovery: every `.opencode/plugins/` (and `~/.config/opencode/plugins/`) loads `.ts` / `.js` files and immediate package directories.
3. A `plugins/` directory **beside** a project-root `opencode.json` is **not** auto-discovered — list it explicitly or put it under `.opencode/plugins/`.
4. `setup` / `effect` runs. Transforms register replayable editors; hooks intercept live ops.
5. Config/plugin file changes under watched dirs reload. `opencode service restart` if a local dep is unwatched.
6. Unload runs `setup` cleanup and disposes registrations.

### Local vs published install

| Path | How |
| --- | --- |
| Dev in this repo | `"plugins": ["./"]` in a consumer `opencode.json`, or symlink/copy `src` into `.opencode/plugins/plan-mode/` |
| Local path | `"./plugins/plan-mode"`, `"../shared/plugin"`, absolute path, or `file:///...` |
| Global package | `opencode plugin add opencode-plan-mode` (also Git: `github:org/repo`) |
| Project package | `plugins: ["opencode-plan-mode"]` in project `opencode.json(c)` |
| Check | `opencode plugin list` — id `plan-mode` should be active |

CLI-only plugins go in `~/.config/opencode/cli.json`, not `opencode.json`. Plan-mode gating must be a **server** plugin.

---

## 2. Extension points we need

There is **no first-class “mode” type** in the plugin API. OpenCode “modes” are **agents** (`primary` | `subagent` | `all`) plus session state. Enter/exit is `switchAgent` and/or session permission rules.

`AgentEditor` can `list` / `get` / `default` / `update` / `remove` — **not `add`**. A plugin cannot register a new agent from `ctx.agent.transform`. Use the built-in `plan` / `build` agents, and/or ship Markdown agents in the **host project** (`.opencode/agents/*.md`).

| Domain | What we use it for |
| --- | --- |
| **Commands** | `/plan`, `/plan-approve`, `/plan-execute`, `/plan-reject`, `/plan-exit`. `ctx.command.transform` is **add-only**. `execute` gets `{ sessionID, prompt, delivery }` and typically calls `ctx.session.prompt` or `switchAgent`. Markdown commands can set `agent: plan` ([commands](https://opencode.ai/v2/docs/commands/)). No global `command.execute.before`. |
| **Tools** | `plan_read` / `plan_write` / `plan_progress`. `ctx.tool.transform` (`add`/`update`/`remove`). `execute.before` / `execute.after` hooks. |
| **Session hooks** | `context`: inject plan instructions, `delete event.tools.write` (and edit/patch) while planning. `prompt`: rewrite admitted user text (not a reject API). Register `compaction`/`generate` separately if those flows must stay consistent. |
| **Agents** | `ctx.session.switchAgent({ sessionID, agent: "plan" \| "build" })`. `ctx.agent.transform` to tweak the built-in `plan` agent (description/permissions) if `Agent.Info` exposes those fields — do not invent a parallel agent unless the consumer adds a Markdown agent file. |
| **Permissions** | Action `edit` covers `edit`/`write`/`patch` (resource = path). **2.0.18:** `ctx.session.update({ sessionID, permissions })` (not `ctx.permission.rules`, which is absent from the plugin types). Evaluated **after** agent rules; last match wins; children inherit at create. `ctx.permission.hook("evaluate")` can change `allow`/`ask` → `deny`; a configured **`deny` is final** and skips the hook. Built-in `question` tool for an approve UI. |
| **Storage** | `ctx.storage` JSON, keyed by plugin `id`. Per-session: `{ phase, planPath, approvedHash, sessionID }`. |

Also useful: `ctx.session.synthetic` (status messages), `ctx.session.interrupt`, `ctx.event.subscribe` (idle/permission events). TUI panel (`session.panel` slot) is a **separate** `@opencode/plugin/tui` plugin — Cursor-like plan sidebar is not available from the server plugin alone.

---

## 3. Plan Mode behavior (Cursor-like, as far as the API allows)

Aspire to: enter plan → research without editing the project → produce an editable plan → user edits → explicit approve → execute **only** that plan → exit.

| Cursor-like step | OpenCode 2 mapping | Gap |
| --- | --- | --- |
| **Enter plan mode** | Command `/plan` → `switchAgent(..., "plan")` + `session.update` permissions deny `edit` except the artifact path; store `phase: "planning"` | No dedicated mode toggle in the server API. Closest UI is the agent switcher (`plan` is already a built-in primary agent). |
| **Research-only** | Built-in `plan` already: allow questions; **deny edits except `~/.opencode/plan`**. Keep `read` / `glob` / `grep` / `webfetch` / `websearch`. Optionally `delete event.tools.write` in `context`. Optionally deny or `ask` `shell` (built-in `plan` does **not** deny shell). | Shell can still mutate files unless we add `shell` deny/`ask` + `execute.before` on `write`/`edit`/`patch`. Hiding tools is not enforcement. |
| **Editable plan artifact** | **Implemented:** `~/.opencode/plan/<sessionID>.md` with Goal / Research / Steps / Notes. Skeleton on `/plan`. User edits the file; `plan_read` / `plan_write`; path + SHA-256 in `ctx.storage`. `/plan-show` + context injection + prompt attachment surface it. | No in-app plan editor unless we add a TUI plugin later. Workspace files are more visible; `~/.opencode/plan` needs no extra allow rule. |
| **Approve / reject gate** | **Implemented:** `/plan-approve`, `/plan-reject`, `/plan-revise`. Approve: snapshot **identity** SHA-256 (checkboxes ignored), `phase: "approved"`, switch to `build`, clear session deny rules, prompt to implement **only** the file. Reject: stay/return to `planning`, re-apply research-only rules, optional feedback to revise the artifact. | Not a dedicated “Build” button. Commands are the gate. The built-in `question` tool is not wired (answers would be chat, not a command). |
| **Execute only against approved plan** | **Implemented:** `/plan-approve` starts implementation; `/plan-execute` continues it. Identity hash must match (`approvedHash`); checkbox progress is allowed. Content drift (Goal / Research / step text / Notes) → `/plan-execute` hard-refuses and mutating project tools are denied until re-approve or reject. `plan_progress` marks checklist items. Instructions: stay on-plan, step in order, ask before large deviations. | Cannot cryptographically bind the agent to the file; identity hash + prompt + drift deny is the API-level guarantee. The model can still wander; we cannot intercept “large deviations” except by instruction. |
| **Exit** | `/plan-exit` → `switchAgent` to `build` (or previous agent), clear session deny rules, `phase: "idle"`. | Session stores selected agent; switching is the exit. |

Built-in `plan` agent ([agents](https://opencode.ai/v2/docs/agents/), [permissions defaults](https://opencode.ai/v2/docs/permissions/#defaults)): primary; explores and plans without editing normal project files; may write OpenCode plan files when asked. A `/plan` **markdown** command with `agent: plan` already switches the session then submits. This plugin should **compose** that, not fight it: add the approve/hash/execute protocol and tighter session rules (especially `shell` if we want closer Cursor parity).

---

## 4. Recommended architecture

**Promise plugin**, not Effect: one extra runtime (`effect`) is unnecessary for commands + hooks + storage. Keep Effect as a later option if the rest of the stack is Effect-native.

**Do not invent a custom agent** in the plugin (cannot `editor.add` an agent). Use:

1. Built-in **`plan`** for research-only.
2. Built-in **`build`** for execute.
3. **Commands** as the user-facing enter / approve / reject / execute / exit API (works in TUI, desktop, and `opencode run`).
4. **Session `update({ permissions })`** as the hard gate (deny `edit` except artifact; deny `shell` and `execute` while planning).
5. **`ctx.storage`** for phase + approved hash (durable, plugin-scoped).
6. **`execute.before`** as defense in depth: if `phase === "planning"` and tool is `write`/`edit`/`patch` and path is not the artifact, throw. After approve, this hook does not fire those denies.
7. **`session.hook("context")`** to attach planning instructions, or after approve “follow this approved plan”.

**Artifact (implemented):** `~/.opencode/plan/<sessionID>.md`. Canonical sections are Goal, Research, Steps (checkbox todos), Notes. `/plan` writes a skeleton if missing. `plan_read` / `plan_write` plus user editor edits. Session storage keeps `planPath` + `contentHash` + `approvedHash`.

**How OpenCode surfaces the plan (2.0.18):**

| Surface | What the user/agent sees |
| --- | --- |
| Disk file | User-editable markdown. This is the document, not chat. |
| `/plan-show` | Synthetic message with markdown + derived checklist. |
| `session.hook("prompt")` | Attaches `file://…/plan.md` while planning so the session UI shows the file. |
| `session.hook("context")` | Injects the **current** file + checklist on each model call (source of truth). |
| Status + `[PLAN] ` title | Path and edit instructions on enter. |

There is no server-plugin plan sidebar. A later TUI plugin could add `session.panel`.

**Approve gate (implemented):** `/plan-approve` / `/plan-reject` / `/plan-revise`. Session storage keeps `approvedHash` as the **identity** SHA-256 (Goal, Research, step text, Notes; checkboxes ignored). Until approved, `permission.evaluate` + `execute.before` still deny project `edit`/`write`/`patch`, `shell`, and `execute`. On approve, those session rules are cleared and the `build` agent is prompted with the file. On reject, rules stay (or are re-applied).

**Execute (implemented):** `/plan-execute` re-prompts only when identity still matches. `plan_progress` updates `[ ]`/`[x]` without changing identity. If plan **content** drifted, execute refuses and the same permission / `execute.before` hooks deny project mutations until `/plan-approve` or `/plan-reject`. Context tells the agent to step through the checklist and ask before large deviations.

**Out of scope for v1 (API limits):** Cursor plan sidebar, drag-to-reorder todos in a native panel, preventing the user from switching agents in the UI. A later TUI plugin could add a `session.panel` named `plan-mode.plan`.

---

## 5. Minimal stub (next card — scaffold only)

Smallest plugin that **loads on 2.0.18**. Do not implement full plan mode yet.

Checklist:

- [ ] `package.json`: `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, dependency `@opencode/plugin` compatible with 2.0.18
- [ ] `src/index.ts` default-exports `Plugin.define({ id: "plan-mode", async setup(ctx) { ... } })`
- [ ] In `setup`, `ctx.command.transform` add one command, e.g. `plan-mode` / `plan`, whose `execute` calls `ctx.session.prompt` with a noop/hello line (or `switchAgent` to `plan` and prompt “Plan mode plugin loaded.”)
- [ ] Optional: `ctx.storage.set("loaded", true)` to prove storage
- [ ] Consumer `opencode.jsonc`: `"plugins": ["./"]` (this repo) or path to the package
- [ ] `opencode service restart` → `opencode plugin list` shows `plan-mode` **active** (not failed)
- [ ] In a session, run `/plan` (or whatever name) and see the prompt land

Install smoke:

```sh
# from a project that points plugins at this package
opencode plugin list
opencode service restart
```

After the stub loads, the following card can add: session phase in storage, `permission.rules` deny `edit`, artifact path, approve hash, execute prompt.

---

## 6. API limits (cannot gate)

Recorded against OpenCode **2.0.18**. Implement enter/exit around these; do not pretend they are native Cursor controls.

| Limit | Consequence |
| --- | --- |
| **No first-class mode type** | Toggle is `/plan`, `/plan-mode`, `/plan-exit` plus `switchAgent("plan" \| previous)`. The agent switcher is not a plugin-owned Plan mode control. |
| **Cannot register a new agent** | `AgentEditor` has no `add`. Use the built-in `plan` / `build` agents. |
| **Cannot hide or replace the UI agent switcher** | The user can still pick `build` (or any primary) in the TUI/desktop. That does **not** run `/plan-exit` or `/plan-approve`. Session deny rules stay until `/plan-approve` or `/plan-exit`. We cannot intercept that switch to auto-exit or auto-enter. |
| **No native Plan badge** | Closest UX: synthetic status + `[PLAN] ` session title prefix. No TUI chrome from a server plugin. |
| **No in-app plan editor / sidebar** | Artifact is a markdown file under `~/.opencode/plan/`. Surfaced via `/plan-show`, prompt attachment, and context injection. A `session.panel` would need a separate `@opencode/plugin/tui` plugin. |
| **`ctx.permission.rules` missing** | Use `ctx.session.update({ permissions })`. Empty array clears extras on exit. |
| **Configured `deny` skips `permission.evaluate`** | The evaluate hook cannot override an existing deny; it can only tighten `allow`/`ask`. |
| **Hiding tools is not enforcement** | Deleting `event.tools.write` in `context` only hides them from the model. Do not hide write/edit if the agent must write the plan artifact. Enforce with session rules + `evaluate` + `execute.before`. |
| **`execute.before` has no typed deny** | Promise hook can only mutate `input` (or throw). Throwing is defense in depth, not a documented permission effect. |
| **Shell is not denied by built-in `plan`** | Plugin adds session `shell` + `execute` deny while `phase === "planning"`. Directory inference on shell is best-effort; MCP tools are not covered. |
| **Prompt hooks cannot reject** | Cannot block a user prompt that says “just implement it”; we can only inject research-only instructions. |
| **User filesystem edits** | Permissions apply to the agent, not the user’s editor. |
| **No cryptographic bind to the plan file** | `/plan-approve` stores identity `approvedHash`. `/plan-execute` hard-refuses on content drift; checkbox progress does not count. The model is still not bound to the file. |
| **Cannot prevent Code Mode nested tools except `execute` deny** | Session rule `{ action: "execute", effect: "deny" }` is the documented Code Mode gate. |

### Exit without approve (documented behavior)

| Command | Draft |
| --- | --- |
| `/plan-exit` or `/plan-mode` (while on) | **Keep** `~/.opencode/plan/<sessionID>.md`. Phase becomes `idle`. |
| `/plan-exit discard` or `/plan-mode discard` | **Discard** (unlink the file; clear storage). |

OpenCode cannot present a native “Keep / Discard” modal on agent-switch. Command arguments are the gate.
