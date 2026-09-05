# jiscribe-mcp

An MCP server that hands the Jiscribe canvas tool set to an AI over stdio, and
opens a local viewer so a person can watch the drawing take shape and edit it by
hand while the AI works.

## Install

```bash
claude mcp add jiscribe -- npx -y jiscribe-mcp
```

Or register it by hand with any MCP client that speaks stdio:

```jsonc
{
	"mcpServers": {
		"jiscribe": { "command": "npx", "args": ["-y", "jiscribe-mcp"] },
	},
}
```

Node 22 or newer is required. Nothing else is: the published package carries the
server, the viewer, and the files the text measurement needs at runtime.

> Early days — the tool set and the viewer still move between 0.x releases.

## What it is

The workspace `.jis.json` file is the single source of truth. The AI edits it
through path-based tools (`add_rect`, `align_objects`, …); the host watches the
file and mirrors it into the viewer. When a person moves or retypes something in
the viewer, it is written back, so the next read shows what they changed. No
canvas state is kept in the tools themselves.

Three families of tools, 68 in all:

- Six of its own: `open_canvas` / `close_canvas` / `diagnose_canvas` /
  `measure_text` / `add_rect` / `add_ellipse`. `open_canvas` takes `headless`,
  which gives the AI a canvas to look at without putting a window on screen
- 46 from `@jiscribe/ai-tools` that a document alone can answer — add, move,
  align, group, style, read, undo — each given a `path` so it names a file
- 16 more from the same declarations that only a mounted canvas can answer —
  capture, camera, selection, measurement — run over the viewer's WebSocket

## The viewer

`open_canvas` starts an HTTP + WebSocket host inside the MCP process (port 5190,
stepping up one at a time if taken) and opens a Chromium app-mode window — no
tabs, no address bar. It falls back to the default browser when no Chromium is
found.

- `JISCRIBE_MCP_BROWSER` — `tab` for the default browser, or the name or path of
  an executable to use in app mode and headless mode
- `JISCRIBE_MCP_NO_OPEN` — set to anything to just return the URL. It means "do
  not put a window up unasked", so `headless: true` is still honoured
- `JISCRIBE_MCP_VIEWER_ROOT` — serve the viewer from another directory

`open_canvas` with `headless: true` opens a window-less Chromium instead, so the
16 screen-side tools have something to work with while the user's screen stays
as it was. It names a Chromium executable directly and never falls back to a
tab, since no default browser has a headless mode; with none installed the tool
says so rather than leaving the AI blind. A viewer that is already connected,
visible or not, is used as it is and nothing new is opened. A plain
`open_canvas` after that puts a window on screen, so a host held open by a
headless window can still be looked at.

The host's lifetime follows the windows: once the last viewer closes and none
comes back within a few seconds, it shuts down and releases the port. A headless
window holds that connection like any other, so it keeps the host alive until it
is closed. Windows are closed by asking the page to close itself over the
WebSocket — the only way that reaches a Windows-side browser launched from WSL —
which happens on `close_canvas` and when the MCP client disconnects. A headless
page that cannot reach the host for 15 seconds closes itself, which is what
catches a `SIGKILL`ed server.

## Developing

```bash
pnpm --filter jiscribe-mcp build   # required: the viewer is served from dist/
node apps/mcp/dist/index.mjs       # stdio; register this path with your client
```

Run pnpm from the repository root, never with the working directory inside
`engine/`. The build output stands alone — `dist/index.mjs` (the server),
`dist/client/` (the viewer), and `dist/node_modules/` (the JSON schema and the
fonts the text measurement needs at runtime) — which is what gets published, so
a checkout is not needed to run it.

To work on the viewer alone, `pnpm --filter jiscribe-mcp dev:viewer` serves it
from vite on 5196 and proxies to the host on 5190.
