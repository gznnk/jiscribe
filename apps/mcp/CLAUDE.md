# CLAUDE.md — apps/mcp

Implementation notes for `jiscribe-mcp`. What the server does for its users
(install, env vars, headless, the viewer's security model as seen from outside)
is in [README.md](./README.md); this file is the invariants behind it and why
they hold.

## Layout

- `src/server.ts` — `createJiscribeMcpServer()`: every tool definition and the
  handshake `instructions`. Its header comment is the authoritative list of the
  tool families. `src/index.ts` only wires stdio and shutdown.
- `src/runtime.ts` — `createJiscribeMcpRuntime()`: what every session of the
  process shares (the host, the path locks, the callBarrier, the undo history,
  and `open_canvas` / `close_canvas` themselves). A server given no runtime
  makes its own and folds it when its client leaves; given one, its owner
  folds it. `apps/desktop` builds one and shares it across its HTTP sessions,
  plugging its windows in through `launchViewer` / `raiseVisibleViewer`.
- `src/host/` — the HTTP + WebSocket host `open_canvas` starts. `canvasHost.ts`
  is wiring only: `viewerRegistry` (sockets, host lifetime),
  `viewerRequestBroker` (requestId round trips), `fileMirror` (the file on
  display: state, watch, writes), `headlessLauncher` (the window-less browser),
  `httpServer` + `requestGuards` (HTTP surface and access checks).
- `src/viewer/` — the SPA. `useCanvasHostSocket` owns connect/reconnect,
  `useDocSync` owns sync and saving.
- `src/shared/` — what both sides read: WS frames (`canvasHostProtocol.ts`),
  the file API route, headers and status codes (`fileApiRoute.ts`), and the
  host actions' names, route and session answer (`hostActionsRoute.ts`; the
  owner's callbacks themselves are `HostActions` in `host/canvasHostTypes.ts`).

## Tools

- **Four families**, listed in the header of `src/server.ts`: this server's own
  tools; `@jiscribe/ai-tools` doc ops (`registerDocTools`, each given a `path`
  so a declaration written for "the open document" becomes a file operation);
  ai-tools screen ops (`registerHandleTools`, run as a WS round trip to the
  viewer); and the shape plugins' tools (`standardAiToolPlugins`, registered
  like doc ops). Do not hardcode counts elsewhere; only the 16 screen tools are
  pinned by a test (`toolRegistry.test.ts`).
- **Routing is by the declaration's `drives`**: a tool that names a `handle.*`
  goes to the viewer, everything else to the file.
- **Declaration and application come from one `canvasToolSet`**
  (`canvasDefinitions.ts`, re-exporting `@jiscribe/doc-tools/canvas-tools`,
  which the CLI's `jiscribe op` shares), so a declared tool that cannot be
  applied cannot exist. Plugin tools that move connect points declare it through
  `connectPointRemap`; `applyCanvasOp` rewrites the attached connector ends.
- **Every name goes through `registerName`**, which throws on a duplicate at
  startup (the SDK would otherwise let the later one win silently).
  `measure_text` is the one clash: ours (dimensions only) keeps the name, the
  ai-tools one is registered as `measure_rendered_text`.
- **Every argument schema is `.strict()`** — zod drops unknown keys by default,
  so a mistyped argument would succeed as a default.
- **`instructions` carries the MCP layer only** (path addressing, which tools
  need a viewer, where validation starts, undo scope, the pointer to
  `read_drawing_guide`). It costs context all session; the canvas model, shape
  usage, drawing craft and JSON format belong in the guides.
- **`read_drawing_guide` resolves the guides through `@jiscribe/doc-schema`'s
  exports** (`@jiscribe/doc-tools/guides`, shared with `jiscribe guide`) and
  errors when they are missing rather than returning empty.
- **`diagnose_canvas` is the only validation entry point.** Do not add a
  variant that takes the document text.

## Files and concurrency

- **Every `path` goes through `toCanvasFilePath`** (`@jiscribe/doc-tools/file`):
  absolute, a canvas extension, resolved through symlinks. Its result is the lock
  key, the undo-history key and the path read and written. `add_rect` / `add_ellipse` go
  through `applyDocOpToFile` as `addObject`, so they share the lock and undo.
- **Calls on one file are serialised** (`pathLock.ts`, entered through
  `canvasFileLock.ts`, which also admits calls in arrival order while their
  paths resolve). Every tool is load → modify → write back, and the AI sends
  independent adds in parallel by default, so without the lock parallel adds
  overwrite each other (`concurrency.test.ts`).
- **`runtime.ts`, `canvasFileLock.ts` and `server.ts` reach the file layer
  through `canvasStore.ts`**, which re-exports `@jiscribe/doc-tools/file` and
  binds `saveCanvasFile`'s refusal to the name `diagnose_canvas`. Tests that
  `vi.mock` a tool's file call mock it there; a tool importing doc-tools
  directly would bypass them. `host/` imports doc-tools directly.
- **Writes go through a temp file and rename** (`@jiscribe/doc-tools/file`'s
  `atomicWrite.ts`). The lock only orders our own writers; the host's watch and
  outside editors read without it and must never see a half-written file.
- **A read-only op writes nothing back**: `applyDocOpToFile` saves only if the
  op called `replaceDoc`, so reads do not shake the viewer or consume undo
  history.
- **Undo history is per file** (capped at `MAX_HISTORY_FILES`, LRU) and can
  only step back what the AI left as is.

## Host and viewer

- **The `.jis` on disk is the only state.** Tools hold no canvas state; the host
  mirrors the file to the viewer and the viewer writes people's edits back.
- **Access** (`requestGuards.ts`, `httpServer.ts`): `Host` must be
  `localhost` / `127.0.0.1` / `[::1]` with our port; WS and PUT with an `Origin`
  must be ours (DNS rebinding). A per-host UUID token from `GET /api/session`
  is required on WS (`?token`) and PUT (`X-Jiscribe-Token`), so a window left
  over from a previous host on the same port cannot write. PUT writes only the
  file on display (409 otherwise), requires `If-Match` with the revision last
  synced (SHA-256 of the doc text, carried on `openCanvas` / `docChanged`;
  428 when absent, 412 when stale, checked against a re-read under the lock),
  and takes the same pathLock as the tools. Containment checks go through
  realpath. `POST /api/action` (`shared/hostActionsRoute.ts`) runs one of the
  callbacks the host's owner passed as `hostActions` (the desktop app's file
  dialog and quit; the stdio server passes none) and is guarded exactly as PUT
  is (Origin, then token); `GET /api/session` lists the offered names as
  `actions`, so a viewer draws a menu only where something answers it.
- **A person's save is broadcast** as `docChanged` to every window; the sender
  drops its own echo by text match and keeps the revision. There is no `saved`
  frame. Without this a headless window kept drawing the pre-edit doc and
  `capture_canvas` returned a stale picture.
- **Questions go to every open window; the first answer wins**
  (`viewerRequestBroker`). Viewers reconnect on their own, so forgotten tabs
  from earlier sessions join a new host; asking only one would time out
  whenever it picked such a tab.
- **A screen tool sees what was sent before it.** It waits on `callBarrier` for
  earlier file calls (reads, `open_canvas` and `close_canvas` included), pushes
  the file with `fileMirror.syncOpenFile` instead of waiting for the poll, and
  sends `expectedRevision` on `handleOpRequest`. The viewer draws that revision
  before acting: 5 s if a person's drag holds it, an immediate `error:` if the
  file is broken. Old tabs ignore the field and answer at once.
- **Pending edits are flushed before switching files**: `openFile` and a
  workspace switch (before the old host closes) send `flushEdits` to all
  windows and wait for every `flushed` or 3 s (`FLUSH_EDITS_TIMEOUT_MS`).
  Since PUT only accepts the file on display, a debounced save would otherwise
  die with 409.
- **The viewer's `localStorage` holds only non-sensitive UI preferences** (the
  rail's pins, `viewer/pinnedCategoryStorage.ts`); never file paths, file names
  or document content. Its origin is `127.0.0.1:<port>`, so any process that
  takes the port can read it, and the port can shift (5190 and up), which only
  loses the preference.
- **Windows are closed with `window.close()` over the WS.** It is the only thing
  that reaches a Windows-side browser launched from WSL — `child.kill()` only
  kills the WSL interop proxy. Kill is a last resort for a Linux Chromium.
  `close_canvas` follows the same path and, if a window refuses to close,
  reports it and leaves the server up: a stopped host makes the stray window
  hunt for a port and join whichever host takes it next.
- **Host lifetime follows the windows** (`viewerRegistry.ts`): one hour after
  the last viewer leaves with none back, the host shuts down. The grace is long
  because background windows are frozen and only reconnect when a person
  returns. A headless window counts as a window.
- **Client disconnect must fold the host** (`index.ts`: stdin `end`, SIGINT,
  SIGTERM → `server.close()`, which asks windows to close then closes the
  host; a 10 s unref'd timer forces exit). Without it a connected headless
  window keeps the HTTP server, and so the process, alive. A headless page
  that cannot reach the host for 15 s closes itself (the SIGKILL case).

## Build

- **`dist/` must run on its own** — no checkout. `build.mjs` produces
  `dist/index.mjs` (esbuild, single file), `dist/client/` (JS and CSS inlined
  into `index.html`; only fonts remain beside it) and `dist/node_modules/`.
- **`dist/node_modules/` is read at runtime by node resolution**: the two guides
  (`canvas-prompt.md`, `authoring-json.md`) and the measurement fonts
  (`resolveFontSourceDir`). No JSON schema. Dropping it fails
  `read_drawing_guide` and silently degrades Japanese measurement to an
  estimate (doc-tools falls back without erroring). Only the weights the
  browser ships are staged (see `build.mjs`), so `findNearestWeight` picks the
  same face. `verifyDist.mjs` (on `prepublishOnly`) refuses to publish a dist
  missing any of this.
- **The host refuses to start without a build** rather than serving 404s. For
  viewer-only work use `dev:viewer` (see README.md).

## Tests

- **vitest** (`pnpm --filter jiscribe-mcp test`): `src/__tests__/mcpTestClient.ts`
  connects a client over the in-memory transport to `createJiscribeMcpServer()`
  and drives `tools/call`.
- **Playwright** (`pnpm --filter jiscribe-mcp test:e2e`, `e2e/`): builds first,
  then drives the built viewer against a real host while the AI side talks
  stdio to `dist/index.mjs` (`e2e/support/mcpStdioClient.ts`). The headless
  spec skips when run as uid 0 (Chromium will not start as root without
  `--no-sandbox`). Hosts take port 5190 upward, so nothing else may be serving
  a canvas meanwhile.
