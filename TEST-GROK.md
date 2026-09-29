# Manual E2E: Grok in OpenCode (2026-09-28)

OpenCode **2.0.18**, model **xai/grok-4.5**, plugin **plan-mode** loaded from this repo.

## Setup that worked

Global `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/Users/justindotrocks/Documents/Programming/opencode-plan-mode/src"
  ]
}
```

```sh
npm install
opencode service restart
opencode plugin list   # plan-mode | local | …/src/index.ts
npx tsx --test test/artifact.test.ts test/gate.test.ts test/execute.test.ts
```

Drive slash commands via the session API (or TUI), not bare `opencode run "/plan …"` text:

```sh
opencode api post /api/session/<id>/command -d '{"name":"plan","text":""}'
opencode api post /api/session/<id>/command -d '{"name":"plan-approve","text":""}'
opencode api post /api/session/<id>/command -d '{"name":"plan-execute","text":""}'
```

Set model explicitly if the free default fails auth:

```sh
opencode api post /api/session/<id>/model -d '{"model":{"id":"grok-4.5","providerID":"xai"}}'
```

## What worked

| Step | Result |
| --- | --- |
| Plugin load | `plan-mode` **active**; commands registered (`plan`, `plan-mode`, `plan-exit`, `plan-show`, `plan-approve`, `plan-execute`, `plan-reject`, `plan-revise`) |
| Unit tests | 18/18 pass |
| `/plan` | Agent → `plan`; title `[PLAN] …`; research-only permissions (`edit` deny except `~/.opencode/plan/**`, `shell`/`execute` deny); skeleton at `~/.opencode/plan/<sessionID>.md` |
| User edit of artifact | File is source of truth; `/plan-show` reprints Goal/Research/Steps/Notes + checklist |
| Gate while planning | Project edit/shell/execute denied via session permissions + hooks |
| `/plan-approve` | Agent → `build`; permissions cleared; approved identity SHA-256 stored; implement prompt attached with plan file |
| Grok execute | Edited `package.json` description only; validated JSON; called `plan.progress` for steps 1 and 2 |
| Checklist | Both steps marked `[x]`; identity hash ignores checkbox progress |
| `/plan-execute` | Re-prompted; Grok verified 2/2 done and stopped (no scope creep) |
| `/plan-reject` | Stays on `plan` agent; research-only perms reapplied |
| `/plan-exit discard` | Agent → `build`; perms cleared; draft unlinked |

Session used for the happy path: `ses_f15966ce8ffe6dFb6pyz6YLOpf` (test mutation reverted after the run).

## What failed / first-pass blockers

| Issue | Severity | Fix / mitigation |
| --- | --- | --- |
| Built-in **plan** agent injects “Do not create or update plan files unless the user explicitly asks,” which fights `plan.write` | High (UX) | Context now **overrides**: ignore that reminder; MUST use `plan.write` for this plugin’s artifact (`src/status.ts` research instructions) |
| Prompts/docs said `plan_write` only; OpenCode surfaces the tool as **`plan.write`** (namespace) | Medium | Prompts mention both `plan.write` / `plan_write` and `plan.progress` / `plan_progress` |
| `opencode run "/plan …"` as a **message** does not always run the slash **command** — agent never enters planning (`plan.write` → “Plan mode is not ON”) | Medium (docs) | Document: use TUI slash, or `POST /api/session/{id}/command` with `name: "plan"` |
| `opencode plugin list` can print “No plugins found” mid-restart | Low | Wait for service healthy; list again |
| Unrelated `@stablekernel/opencode-cursor@latest` fails V2 load (no default Plugin.define) | Low (host config) | Remove or upgrade that package; not required for plan-mode |
| Default free model hit `provider.auth` on first plan turn | Low (env) | Pin `xai/grok-4.5` (or any authed model) on the session |

## Conclusion

End-to-end **plan → approve → execute** works with Grok on OpenCode 2.0.18 when the plugin is loaded and slash commands are invoked as commands. First-pass code fixes target the built-in plan-agent instruction clash and tool naming so the agent is more likely to draft via `plan.write` and mark progress via `plan.progress`.
