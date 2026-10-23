# CLAUDE.md — apps/vscode-extension

Implementation notes for the VSCode extension (package name `jiscribe`).

## Manual testing

`pnpm --filter jiscribe watch`, open `engine/apps/vscode-extension` in VSCode
(or `apps/vscode-extension` in a standalone clone), press `F5`, and open a
`.jis` file in the Extension Development Host.

## Automated tests

Two layers, both run from the repository root:

- **`pnpm --filter jiscribe test`** — vitest over the logic split out so it
  needs no VSCode API (`src/**/__tests__/`).
- **`pnpm --filter jiscribe test:e2e`** — builds, then `@vscode/test-cli` /
  `@vscode/test-electron` launch a real VSCode, both 1.85.0 (the
  `engines.vscode` minimum) and stable, and run the suites in `e2e/`. The
  first run downloads VSCode into `.vscode-test/`.

**The e2e suite cannot see inside a Webview, but it can stand in for one.**
`activate` returns a `JiscribeTestApi` (`src/types/testApi.ts`) only when
`context.extensionMode` is `vscode.ExtensionMode.Test`. Through it a test
posts messages as the Webview (e.g. `update`) and observes what the extension
posts back (`src/editor/webviewBridgeRegistry.ts`; helpers in
`e2e/support/webviewBridge.ts`). So Webview-originated flows are covered —
commit → write-back → dirty, and for the image editors (`.jis.png` /
`.jis.svg`) save, the fallback when the canvas cannot render (a hidden tab),
repairing the stale image afterwards, and revert, because the test answers the
render request in the Webview's place. Out of reach is only what needs the
Webview to actually draw.

**VSCode 1.85.0 needs an existing `XDG_RUNTIME_DIR`.** Under WSL it may point at
a directory that does not exist; `.vscode-test.mjs` then fails fast with the
reason instead of hanging. Run with a fresh one:

```bash
XDG_RUNTIME_DIR=$(mktemp -d) pnpm --filter jiscribe test:e2e
```
