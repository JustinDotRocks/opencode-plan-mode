# agent-guardrails

## Purpose

Shared agent-guardrails pack for KanDev/OpenCode-style agents. Edit pack files only in this repo (`JustinDotRocks/agent-guardrails`).

## Layout (consuming repo)

- Pack at `docs/agent` via git subtree.
- Project overlay = root `AGENTS.md` + `docs/project/`.

## Install

Justin, on a branch, merge via PR:
Tags are cut from main only (Justin promotes dev to main). Always subtree from a main tag; never from dev.

```
git subtree add --prefix=docs/agent https://github.com/JustinDotRocks/agent-guardrails.git <tag> --squash
```

Then copy `templates/project/*` to `docs/project/` and fill in. Add a root `AGENTS.md` that loads `docs/agent/AGENTS.base.md` and `docs/project/PROJECT.md`.

## Update

Justin, on a branch, merge via PR:
Tags are cut from main only (Justin promotes dev to main). Always subtree from a main tag; never from dev.

```
git subtree pull --prefix=docs/agent https://github.com/JustinDotRocks/agent-guardrails.git <tag> --squash
```

## Rule

Edit pack files only here (`JustinDotRocks/agent-guardrails`), never in the subtree copy inside a consuming repo.

## Branches

- `dev` = staging
- `main` = major-feature releases only (Justin promotes)

## History

Originally developed in JustinDotRocks/opencode-plan-mode (PRs #20, #30, #31, #32 there).
