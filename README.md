# opencode-plan-mode

OpenCode 2 plugin: Cursor-like plan mode (draft a plan, gate edits until approved, then execute).

This package loads as plugin id `plan-mode` on OpenCode **2.0.18**. This revision adds enter/exit and the research-only phase. Approve and execute come later.

## Plan mode toggle

OpenCode has no first-class mode type. This plugin’s toggle is commands plus the built-in `plan` agent:

| Command | Behavior |
| --- | --- |
| `/plan` | Enter Plan mode (research only). Extra arguments are submitted as the research prompt. |
| `/plan-mode` | Toggle. Turning it **off** keeps the draft unless you pass `discard`. |
| `/plan-exit` | Exit **without approving**. Default **keep** the draft. `/plan-exit discard` deletes it. |

While Plan mode is on:

- Status is posted in the session and the title is prefixed with `[PLAN] `.
- The session switches to the built-in `plan` agent.
- Project `edit`/`write`/`patch`, `shell`, and Code Mode `execute` are denied. Read/glob/grep/web stay available.
- The agent may write only `~/.opencode/plan/<sessionID>.md`.

### Exit without approving

| Action | Draft artifact |
| --- | --- |
| `/plan-exit` or `/plan-mode` | **Kept** on disk. Re-enter with `/plan` to resume. |
| `/plan-exit discard` or `/plan-mode discard` | **Discarded** (file deleted). |

Nothing is executed on exit. Approval is a later command.

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

`plan-mode` should be **active**. Use `/plan` or `/plan-mode` in a session.

See `NOTES.md` for OpenCode API limits (what this plugin cannot gate).
