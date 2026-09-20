# jiscribe-mcp

An MCP server that hands the Jiscribe canvas tool set to an AI over stdio, and
opens a local viewer so a person can watch the drawing take shape and edit it by
hand while the AI works.

## Install

```bash
claude mcp add jiscribe -- npx -y jiscribe-mcp   # Claude Code
codex mcp add jiscribe -- npx -y jiscribe-mcp    # Codex
copilot mcp add jiscribe -- npx -y jiscribe-mcp  # GitHub Copilot CLI
```

In VSCode, `code --add-mcp '{"name":"jiscribe","command":"npx","args":["-y","jiscribe-mcp"]}'`
registers it for Copilot's agent mode.

Or register it by hand with any client that speaks stdio. Most of them take the
server under `mcpServers`:

```jsonc
{
	"mcpServers": {
		"jiscribe": { "command": "npx", "args": ["-y", "jiscribe-mcp"] },
	},
}
```

VSCode's own `mcp.json` is the exception — it calls the same map `servers`:

```jsonc
{
	"servers": {
		"jiscribe": { "command": "npx", "args": ["-y", "jiscribe-mcp"] },
	},
}
```

Node 22 or newer is required. Nothing else is: the published package carries the
server, the viewer, and the files the text measurement needs at runtime.

> Early days — the tool set and the viewer still move between 0.x releases.

## What it is

The workspace `.jis` file is the single source of truth. The AI edits it
through path-based tools (`add_rect`, `align_objects`, …); the host watches the
file and mirrors it into the viewer. When a person moves or retypes something in
the viewer, it is written back, so the next read shows what they changed. No
canvas state is kept in the tools themselves.

Every path a tool takes is absolute and names a canvas file (`.jis`, or the
longer `.jis.json` / `.jiscribe` / `.jiscribe.json`); anything else is refused,
so a tool can never rewrite a file of another kind. The path is resolved
through its symbolic links first: one file named two ways is one file to the
lock and the undo history, a `.jis` that is a link is edited where it leads,
and a link to a file of another kind is refused. The one exception is an
`image` shape's `src`, which is relative to the directory its `.jis` lives in
and cannot climb out of it — so a drawing and the pictures it names travel
together.

Three families of tools, 69 in all:

- Seven of its own: `read_drawing_guide` / `open_canvas` / `close_canvas` /
  `diagnose_canvas` / `measure_text` / `add_rect` / `add_ellipse`.
  `open_canvas` takes `headless`, which gives the AI a canvas to look at without
  putting a window on screen
- 46 from `@jiscribe/ai-tools` that a document alone can answer — add, move,
  align, group, style, read, undo — each given a `path` so it names a file
- 16 more from the same declarations that only a mounted canvas can answer —
  capture, camera, selection, measurement — run over the viewer's WebSocket.
  The one that measures a slot as drawn is registered as `measure_rendered_text`,
  since `measure_text` above answers from dimensions alone

The handshake carries `instructions` describing this server alone: that files are
addressed by absolute path, which tools need a viewer, where validation starts.
The canvas itself — what it can hold, what each shape is for, how to draw well,
and how the JSON is laid out — is not in there. It is prose too large to sit in
the context all session, so `read_drawing_guide` fetches it on demand:
`"drawing"` before starting a diagram, `"json-format"` when a `.jis` file is
to be edited directly rather than through these tools.

## The viewer

`open_canvas` starts an HTTP + WebSocket host inside the MCP process (on
`127.0.0.1`, port 5190, stepping up one at a time if taken, as far as 5209; the
URL it returns names that address) and opens a Chromium app-mode window — no
tabs, no address bar. It falls back to the default browser when no Chromium is
found.

- `JISCRIBE_MCP_BROWSER` — `tab` (or `default`) for the default browser, or the
  name or path of an executable to use in app mode and headless mode
- `JISCRIBE_MCP_NO_OPEN` — set to any non-empty value to just return the URL. It
  means "do not put a window up unasked", so `headless: true` is still honoured
- `JISCRIBE_MCP_VIEWER_ROOT` — serve the viewer from another directory

The host listens on `127.0.0.1` only and answers to `localhost`,
`127.0.0.1` and `[::1]` alone — a request under any other `Host` is refused,
which is what DNS rebinding looks like from here. A WebSocket or a write from
a page on another origin is refused too, and both carry a per-host session
token the page fetches from `/api/session` (a window left over from a host
that served another directory on the same port cannot write into this one).
The file API writes only the file on display and reads only the images a
diagram points at (reads check the `Host` alone, since a page elsewhere can
embed such an image but not read it), never a path outside the diagram's
directory, symbolic links included. Every write is parsed as a canvas document
first, names the revision the window last synced (`If-Match`, the SHA-256 the
host put on the `openCanvas` / `docChanged` frame) and goes through the same
per-file lock the tools use, so a person's save and the AI's write cannot
overwrite each other unnoticed: a save behind the file is refused with 412.
Edits the file does not hold yet are not drawn over by a newer file either:
the window merges them onto it object by object and writes the result, and
where both sides changed the same object the file wins and a notice names —
by the text on it, or its type — what was not saved. A newer file that arrives mid-drag or while text is
being typed waits until the person lets go. The window knows a document by
the host that sent it as well as by its path, so a file of the same name in
another directory starts afresh — its undo history does not reach back into
the previous file — while a reconnect to the same host keeps it. An edit is
written only to the document it was made on: before another file goes on
display the window writes out what it holds, and an edit the canvas hands over
after the switch is reported in a notice rather than saved into the new file.
Such notices go on their own after a few seconds, since there is nothing left
to resolve; the error bar is kept for what lasts until it is fixed — a broken
or missing file, a write that failed.

`open_canvas` with `headless: true` opens a window-less Chromium instead, so the
16 screen-side tools have something to work with while the user's screen stays
as it was. It names a Chromium executable directly and never falls back to a
tab, since no default browser has a headless mode; with none installed the tool
says so rather than leaving the AI blind. It runs on a throwaway profile in a
temporary directory the host creates for it, removed when the window goes (and
swept on the next launch if a killed server left it behind), so it never
contends with the browser the user already has open — and carries none of their
extensions, sessions or history. Under WSL, where the browser is a Windows-side one, that
directory is this user's Windows `TEMP`, which Windows itself is asked for; if it
cannot be had, those browsers are left out of the attempt and the tool says why,
rather than falling back to a profile someone else on the machine can reach. A viewer that is already connected,
visible or not, is used as it is and nothing new is opened. A plain
`open_canvas` after that puts a window on screen, so a host held open by a
headless window can still be looked at.

The host's lifetime follows the windows: once the last viewer closes and none
comes back within an hour, it shuts down and releases the port. The grace is that
long because a browser puts a window left in the background to sleep, and the
page only reconnects when the person returns to it; the host has to still be
there when they do. A headless window holds that connection like any other, so
it keeps the host alive until it is closed. Windows are closed by asking the page to close itself over the
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
`dist/client/` (the viewer), and `dist/node_modules/` (the JSON schema, the two
guides `read_drawing_guide` returns, and the fonts the text measurement needs at
runtime) — which is what gets published, so a checkout is not needed to run it.

To work on the viewer alone, `pnpm --filter jiscribe-mcp dev:viewer` serves it
from vite on 5196 and proxies to the host on 5190.

`pnpm --filter jiscribe-mcp test:e2e` runs the Playwright suite in `e2e/`, which
drives the real viewer in a real Chromium against a real host and the server as
it is shipped. It builds first (the build above, some twenty seconds) because the
host serves `dist/client/` and refuses to start without it. What it covers is the
half the vitest suite cannot see: the file being drawn, a tool's write reaching
the page, a person's edit reaching the file, a second file taking the page over,
the edits buffered in the page being written out before another file goes up,
an undo that stays with its own file across a switch to another directory,
`capture_canvas` answered by the drawn canvas, and a write refused for a file
that moved on. The hosts take the usual port (5190 upwards), so nothing else may
be serving a canvas while it runs.
