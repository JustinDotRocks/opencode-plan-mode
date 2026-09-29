# opencode-plan-mode

OpenCode 2 plugin: Cursor-like plan mode (draft a plan, gate edits until approved, then execute).

This package currently ships a **load stub** (`id: plan-mode`). Full plan-mode behavior comes in follow-up work.

## Load locally

Pin matches OpenCode **2.0.18**:

```sh
npm install
```

Point OpenCode at this directory. Relative paths resolve from the config file that contains them.

Project (this repo already includes this). OpenCode 2.0.18 requires a **directory** path, not a `.ts` file:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./src"]
}
```

Global:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-plan-mode/src"]
}
```

Then:

```sh
opencode service restart
opencode plugin list
```

`plan-mode` should be **active**. In a session, `/plan-mode` posts a stub notice.

The default export is an OpenCode 2 definition (`id` + `setup`) via `Plugin.define`, which is the shape OpenCode 2.0.18 requires. V1 function exports fail with:

`Plugin must export a default definition with an id and an effect or setup function.`
