# CLAUDE.md — apps/desktop

Implementation notes for `jiscribe-desktop` (a proof of concept). What the app
does for its users (build, connecting a client, the windows, quitting, what the
endpoint does and does not protect against) is in [README.md](./README.md);
this file is the invariants behind it and why they hold.

## Layout

- `src/main/` is all there is: `index.ts` (app lifecycle, menu, signals),
  `mcpHttpServer.ts` (the Streamable HTTP endpoint and its sessions),
  `viewerWindows.ts` (the windows). The renderer is one static placeholder page
  printing the URL and an `.mcp.json` stub, and there is no preload: the viewer
  is the page the canvas host serves, and it uses no Electron API.
- `createJiscribeMcpRuntime` / `createJiscribeMcpServer` come from
  `jiscribe-mcp/server`, a subpath export that points at `src/server.ts` of the
  workspace package. It is not in `dist/`, so the published tarball's
  `publishConfig.exports` replaces it with `./package.json` alone.
- One runtime per process (host, path locks, callBarrier, undo history), and an
  `McpServer` per HTTP session over it. The windows are plugged in through the
  runtime's `launchViewer` / `raiseVisibleViewer`.

## Windows and lifetime

- **Closing the main window hides it.** `close` is prevented, the window hides
  and loads the placeholder, which drops the viewer's WebSocket; that drop is
  how `close_canvas` and the host's idle fold learn the window is gone. It
  comes back on `open_canvas`, or on starting the app again (`second-instance`:
  while the host is alive its viewer is loaded, not the placeholder). Quitting
  is File → Quit / Ctrl+Q / SIGINT (`before-quit` closes the runtime and the
  HTTP server before exit). SIGTERM is not handled: Electron dies at once.
- **Headless windows live as long as the AI clients**, as the stdio server's
  headless Chromium does. When the last HTTP session ends,
  `closeHeadlessWindows` destroys them. A session ends on DELETE, or once the
  GET event stream its client holds has been gone for 30 s
  (`abandonedSessionGraceMs` in `mcpHttpServer.ts`): neither the SDK client's
  `close()` nor Claude Code exiting sends a DELETE. The main window is the
  person's and is left alone.
- The viewer's own `window.close()` (the `closeViewer` frame) destroys the
  window without a `close` event, so the main window is created when missing
  (`mainWindow: BrowserWindow | null`) rather than reused for good.
- `JISCRIBE_MCP_NO_OPEN` is dropped at startup. It is the stdio server's
  "spawn no browser"; left in place, `open_canvas` answers "opened … viewer"
  and shows no window.

## Endpoint

- **There is no authentication**: any process on the machine can connect, and
  under WSL2 that includes Windows-side ones. What there is: the SDK's Host
  check, 403 for any request carrying `Origin`, at most 64 sessions (a
  streamless idle one gives way, and 10 minutes without a request ends one),
  navigation locked (every `will-navigate` and window open goes to the system
  browser) and permission requests refused except the clipboard. A Bearer token
  is not done: it changes how a client is connected.

## Build

- `electron.vite.config.ts` sets `externalizeDeps: false` so `out/` runs on
  its own. Vite bundles ws's optional `bufferutil` / `utf-8-validate` as empty
  objects, after which `unmask` throws on a masked frame of 32 bytes or more
  and Electron's error dialog stops the main thread, MCP included; `define`
  sets `WS_NO_BUFFER_UTIL` / `WS_NO_UTF_8_VALIDATE` to keep ws on its JS path.
  For the same reason `uncaughtException` goes to stderr, not a dialog.
- Staging (`stageMcpRuntime.mjs`) copies mcp's `dist/client` to
  `out/main/client` and `dist/node_modules` to `out/node_modules`, and fails
  naming `pnpm build:mcp` when mcp is not built. electron-vite empties
  `out/main` every time it writes main (build, dev and preview alike), so the
  main config's vite plugin (`writeBundle`) copies again each time. `start` is
  `preview --skipBuild`: the built `out/` as it is.
- electron 43 has no postinstall and downloads its binary into
  `node_modules/electron/dist` on the first `require("electron")`, so the
  first run waits.
- Not done: installer, tray, autostart, a stdio bridge.
