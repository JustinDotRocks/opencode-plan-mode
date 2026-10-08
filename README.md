# opencode-plan-mode

OpenCode 2 plugin that adds a Cursor-like Plan mode: research without editing the project, keep an editable plan file, then approve before the agent implements.

Plugin ids: `plan-mode` (server) and `plan-mode.tui` (TUI chrome). Tested on OpenCode **2.0.18**. This v0 package is not published to npm (`"private": true`).

## Requirements

- OpenCode **2** (this repo is pinned and tested against **2.0.18**). V1 plugins do not load.
- Node.js and npm, so the local `@opencode/plugin` dependency can be installed.

## Install

v0 is a local checkout. You do not need to publish it.

### 1. Clone and install dependencies

```sh
git clone https://github.com/JustinDotRocks/opencode-plan-mode.git
cd opencode-plan-mode
npm install
```

`npm install` pulls `@opencode/plugin@2.0.18`, which the entrypoint imports. Skip this and the plugin can fail to load.

### 2. Add a config snippet

OpenCode 2.0.18 loads a **directory**, not a lone `.ts` file. Point `plugins` at this **package directory** (the checkout that contains `package.json`, `index.ts`, and `tui.ts`). Paths are relative to the config file that contains the entry, unless you use an absolute path. Do not point at `src` or at `src/index.ts` alone: a `src`-only path loads the server gate and does not resolve the TUI sibling.

**This repository** (already in `opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./"]
}
```

**Another project**, or global config at `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-plan-mode"]
}
```

Replace the path with your checkout. Do not put the **server** gate only in `~/.config/opencode/cli.json`. CLI-only plugins stay active against a remote server and do **not** run the server tool gate.

Verified on OpenCode **2.0.18**: package-root `opencode.json` (`"./"` here, or an absolute path to the checkout). Root `index.ts` and `tui.ts` re-export `src/index.ts` and `src/tui.tsx` so the directory loader finds both siblings. No `cli.json` entry and no extra `package.json` `main` / `exports["./server"]` fields were required. `package.json` already has `exports["./tui"]`; local directory load on 2.0.18 still needs those root entry files.

Plugin arrays **merge** from global config, then project `opencode.json(c)`, then `.opencode/opencode.json(c)`. A later file does not replace earlier plugin lists. To turn this plugin off without deleting the entry:

```jsonc
{
  "plugins": ["-plan-mode"]
}
```

This plugin does not read `plugins[].options`. There is no `artifactDir` setting. Plans always live at `~/.opencode/plan/<sessionID>.md`.

Optional auto-discovery (not the path verified in the Grok run): symlink the **package directory** (the checkout that contains `package.json`), not a single file, into a plugins folder OpenCode scans:

```sh
mkdir -p ~/.config/opencode/plugins
ln -s /absolute/path/to/opencode-plan-mode ~/.config/opencode/plugins/opencode-plan-mode
```

A `plugins/` directory sitting next to a project-root `opencode.json` is **not** auto-discovered. List it explicitly, or put it under `.opencode/plugins/`.

### 3. Restart and confirm

```sh
opencode service restart
opencode service status
opencode plugin list
```

`opencode plugin list` should show **`plan-mode`** **active**, sourced from `index.ts` (the server entry; it re-exports `src/index.ts`). On 2.0.18 that CLI table is one row: TUI is a **feature** of the same local plugin (`tui.ts` beside `index.ts`, which re-exports `src/tui.tsx`, id `plan-mode.tui`). Confirm TUI is enabled:

```sh
opencode api plugin.list
```

In the `plan-mode` object, `source.path` should end with `index.ts` and `features` should include `"server": true` and `"tui": true`. If `plugin list` prints “No plugins found” immediately after restart, wait until the service is healthy and list again.

Unrelated V1 packages in the same config (for example `@stablekernel/opencode-cursor`) fail to load on V2. Remove them if the log is noisy. They are not required for this plugin.

## Publishing (optional, not part of v0)

Do not `npm publish` this revision. `package.json` sets `"private": true`, so npm will refuse.

Local directory install above is the supported v0 path. A Git spec such as `opencode plugin add github:JustinDotRocks/opencode-plan-mode` was not the path verified on 2.0.18.

If you publish later:

1. Remove `"private": true`.
2. Keep `@opencode/plugin` pinned to an OpenCode release you have tested (today: `2.0.18`).
3. Publish, then consumers can use:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-plan-mode"]
}
```

or `opencode plugin add opencode-plan-mode`.

## Usage

OpenCode has no first-class mode type. The toggle is these commands plus the built-in `plan` agent. The TUI also exposes **Enter plan**, **Exit (keep)**, and **Discard** on the session composer and plan panel header; those call the same `/plan` and `/plan-exit` handlers. Closing the plan panel does not exit or discard. **Enter plan** also appears under the start-screen input (before a session exists) and starts plan mode without sending a prompt. **Enter plan** from our chrome (start screen, composer, or palette) also opens the Plan panel. While in Plan mode, **Open plan** on the in-session chrome (and the **Open plan panel** palette command) opens the Plan panel; Close hides it without exiting Plan mode.

| Command | Behavior |
| --- | --- |
| `/plan` | Enter Plan mode (research only). Extra arguments are the research prompt. |
| `/plan-mode` | Toggle. Turning it **off** keeps the draft unless you pass `discard`. |
| `/plan-exit` | Exit **without approving**. Default **keeps** the draft. `/plan-exit discard` deletes it. |
| `/plan-show` | Reprint the artifact and derived checklist in the session. |
| `/plan-approve` | Approve the file, unlock implementation tools, and follow that file. Extra args are optional notes. |
| `/plan-execute` | Continue the **approved** plan. Hard-refuses if Goal, Research, step text, or Notes drifted. |
| `/plan-reject` | Reject or revise. Stay in Plan mode. Extra args are feedback. No project changes. |
| `/plan-revise` | Alias of `/plan-reject`. |

Run them from the TUI, or as commands (not as chat text):

```sh
opencode api post /api/session/<id>/command -d '{"name":"plan","text":""}'
opencode api post /api/session/<id>/command -d '{"name":"plan-approve","text":""}'
opencode api post /api/session/<id>/command -d '{"name":"plan-execute","text":""}'
```

`opencode run "/plan …"` may treat that string as a normal message. Plan mode will not turn on, and `plan.write` will report that Plan mode is not on.

While planning you should see a session status message and a `[PLAN] ` title prefix. The session switches to the built-in `plan` agent.

### Plan file

```text
~/.opencode/plan/<sessionID>.md
```

`/plan` writes a skeleton if the file is missing. Edit it in any editor **before** approve. The plugin re-reads the file on each model call, so your edits win over earlier chat.

```markdown
# Plan title

## Goal

## Research

## Steps

- [ ] First concrete step
- [x] Done step

## Notes
```

Steps under `## Steps` become the checklist. OpenCode 2.0.18 has no plan sidebar. The file is surfaced by:

1. The path on disk.
2. `/plan-show` (synthetic session message).
3. A `plan.md` attachment on prompts while a plan session exists.
4. System context injected on each model call (what the agent must follow).

| Tool | Role |
| --- | --- |
| `plan.read` (`plan_read`) | Load the latest file from disk. |
| `plan.write` (`plan_write`) | Update Goal / Research / Steps / Notes while planning. Omit a field to keep it. |
| `plan.progress` (`plan_progress`) | After approve, mark a 1-based step done or reopened. Does not change step text. |

On 2.0.18 the model sees `plan.write` / `plan.progress`. Some listings use `plan_write` / `plan_progress` (namespace dots normalized to `_`). Prompts mention both.

### Approve, reject, execute

| Action | Tools | Artifact |
| --- | --- | --- |
| `/plan-approve` | Unlocked (`build`, or the agent you were on). Session deny rules cleared. Identity SHA-256 stored as `approvedHash`. | Kept. Source of truth. |
| `/plan-execute` | Re-prompts implementation. Refuses if plan **content** drifted. | Kept. Checkbox progress is allowed. |
| `/plan-reject` or `/plan-revise` | Locked again (research only), including if you had already approved. | Kept. Feedback is passed through so the agent can revise the file. |
| `/plan-exit` or `/plan-mode` off | Unlocked, nothing implemented. | **Kept**. `/plan` resumes it. |
| `/plan-exit discard` or `/plan-mode discard` | Unlocked, nothing implemented. | **Deleted**. |

After approve, the agent should walk the checklist in order and call `plan.progress` when an item is done. Checkbox changes do not invalidate approval. Edits to Goal, Research, step **text**, or Notes do. Ask before large deviations; the plugin cannot intercept those in chat, only deny project mutations after content drift.

## Security: tool gating

Plan mode is a **tool gate**, not a sandbox. Allowed tools run as your user. The gate narrows what the agent may call until you approve. It does not isolate the process, the network, or your editor.

### While Plan mode is on and not approved

Entering `/plan` writes these session rules (last match wins). `edit` covers `edit`, `write`, and `patch`. `execute` is the Code Mode switch. `shell` is every shell command, not an allowlist.

The allow path is the absolute plan directory from `os.homedir()` (on macOS, `/Users/<you>/.opencode/plan/*` and `/**`), not a `~` pattern and not “this session’s file only.” Any file under that directory is writable while planning, including another session’s plan. Project files are not.

| Action | Resource | Effect |
| --- | --- | --- |
| `edit` | `*` | deny |
| `edit` | `<homedir>/.opencode/plan/*` and `/**` | allow |
| `shell` | `*` | deny |
| `execute` | `*` | deny |

Still available for research: `read`, `glob`, `grep`, `webfetch`, `websearch`, and the plan tools.

Two more checks run even if rule order lets a call through:

1. `permission.evaluate` forces `shell`, `execute`, and project `edit` to deny. It can only tighten `allow` or `ask`. A configured **deny is final** and skips this hook, so this plugin cannot unlock a deny you (or a policy) already set. A deny of `~/.opencode/plan/**` will block the artifact.
2. `tool.execute.before` throws if `write`, `edit`, or `patch` targets a path outside the plan directory. That throw is defense in depth, not a typed permission result.

Switching agents in the UI does **not** clear these rules and does **not** approve the plan. They stay until `/plan-approve` or `/plan-exit`.

### After approve

`/plan-approve` clears the session deny list and switches back to `build` (or the previous agent). Implementation tools are unlocked.

If Goal, Research, step text, or Notes change after that, project `edit`, `shell`, and `execute` are denied again until `/plan-approve` or `/plan-reject`. Marking `[ ]` to `[x]` does not count as drift. `/plan-execute` refuses to prompt when the identity hash no longer matches.

### What is not gated

Do not treat Plan mode as isolation.

| Gap | Why it matters |
| --- | --- |
| Your editor and shell | Permissions apply to the agent, not to you. You can still edit the repo, including the plan file. |
| Other plans in `~/.opencode/plan/` | The allow is the directory, not one session file. A planning agent can overwrite another session’s artifact there. |
| MCP tools | Their action is `<server>_<tool>`, not `edit`, `shell`, or `execute`. A connected MCP server can still change state while planning. Disconnect servers you do not want live during a plan. |
| Subagents | Launching a subagent is not denied. A child created **while** planning inherits the session rules at creation. A child created earlier does not pick them up later. |
| Prompt text | Hooks cannot reject “just implement it.” The block is the tool gate, not the chat. |
| Hiding tools from the model | Not used as enforcement. Removing `write` from context would also stop the agent writing the plan file, and it is not a permission deny. |
| Code Mode nesting | Denying `execute` is the documented way to keep Code Mode off. This plugin does not inspect tools a nested runtime would call if `execute` were allowed. |
| Cryptographic bind | Approval stores an identity SHA-256 (checkboxes ignored). Drift re-locks mutating tools. The model is still not bound to the file and can discuss out-of-scope work. Large deviations are an instruction, not an interceptor. |
| Shell command scanning | Irrelevant while planning, because **all** `shell` is denied. Do not replace that with a pattern meant to recognize every dangerous command. Directory inference from shell text is best-effort and is not this plugin’s control. |
| Policies | An org or project policy can hard-deny after these rules. This plugin cannot grant what a policy denies. |

After approve, the agent has the same tool authority as a normal `build` session, including shell, until you reject or the plan content drifts.

## OpenCode 2 caveats

Recorded against **2.0.18**. Later 2.x docs allow a `.ts` plugin path; that is not what loaded in testing here.

- **V2 plugin shape only.** Default export is `Plugin.define({ id: "plan-mode", setup })`. A V1 function export does not run. The config key is `plugins`, not `plugin`.
- **No first-class Plan mode type, native sidebar, badge, or Approve button in OpenCode itself.** This package’s TUI plugin (`plan-mode.tui`, loaded from `tui.ts` → `src/tui.tsx`) adds composer **Enter plan** / **Exit (keep)** / **Discard** and a `session.panel` Plan chrome. The built-in `plan` agent, `[PLAN] ` title, and synthetic status still apply.
- **Cannot register an agent.** `AgentEditor` has no `add`. This plugin uses built-in `plan` and `build`.
- **Cannot hook the agent switcher.** Picking another agent in the TUI or desktop does not run `/plan-exit` or `/plan-approve`.
- **Directory load on 2.0.18.** Use `"plugins": ["./"]` (or an absolute path to the package directory). That directory must contain `index.ts` and `tui.ts`. Do not point at `src` or at a lone `.ts` file.
- **Server plugin.** Tool gating must be configured in `opencode.json`, not `cli.json`.
- **Commands vs `opencode run` text.** Prefer TUI slash commands or `opencode api post /api/session/<id>/command`.
- **Built-in plan reminder.** OpenCode tells the `plan` agent not to create or update plan files. This plugin’s context overrides that for `~/.opencode/plan/<sessionID>.md` and requires `plan.write`.
- **Tool ids.** On 2.0.18 the model sees `plan.write` and `plan.progress`. Underscore forms (`plan_write`, `plan_progress`) also appear where namespace dots are normalized to `_`. Prompts mention both so the agent can find the tool.
- **Permission API used here.** Rules are applied with `session.update({ permissions })`. On 2.0.18, `ctx.permission.rules` was not in the plugin types this package was built against. Approve and exit clear extras with `permissions: []`.
- **Keep vs discard** is a command argument. There is no native modal. `/plan-exit` keeps the file; `/plan-exit discard` deletes it.
- **Unwatched local edits** may need `opencode service restart` before the service picks them up.
- **Publishing is optional** and skipped for v0.

API research and the limits table: [`NOTES.md`](./NOTES.md). Manual Grok run (plan → approve → execute): [`TEST-GROK.md`](./TEST-GROK.md).

## Tests

```sh
npx tsx --test test/artifact.test.ts test/gate.test.ts test/execute.test.ts
```

License: MIT (`package.json`). No `LICENSE` file is shipped in v0.
