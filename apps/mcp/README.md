# jiscribe-mcp

An MCP server that hands the Jiscribe canvas tool set to an AI over stdio, and
opens a local viewer so a person can watch the drawing take shape and edit it by
hand while the AI works.

## What it is

The workspace `.jis.json` file is the single source of truth. The AI edits it
through path-based tools (`add_rect`, `align_objects`, …); the host watches the
file and mirrors it into the viewer. When a person moves or retypes something in
the viewer, it is written back, so the next read shows what they changed. No
canvas state is kept in the tools themselves.

Three families of tools, 69 in all:

- Seven of its own: `open_canvas` / `close_canvas` / `validate_canvas` /
  `diagnose_canvas` / `measure_text` / `add_rect` / `add_ellipse`
- 46 from `@jiscribe/ai-tools` that a document alone can answer — add, move,
  align, group, style, read, undo — each given a `path` so it names a file
- 16 more from the same declarations that only a mounted canvas can answer —
  capture, camera, selection, measurement — run over the viewer's WebSocket

## Running it

```bash
pnpm --filter jiscribe-mcp build   # required: the viewer is served from dist/
node apps/mcp/dist/index.mjs       # stdio; register this with an MCP client
```

The build output stands alone — `dist/index.mjs` (the server), `dist/client/`
(the viewer), and `dist/node_modules/` (the JSON schema and the fonts the text
measurement needs at runtime). No repository checkout is required to run it.

## The viewer

`open_canvas` starts an HTTP + WebSocket host inside the MCP process (port 5190,
stepping up one at a time if taken) and opens a Chromium app-mode window — no
tabs, no address bar. It falls back to the default browser when no Chromium is
found.

- `JISCRIBE_MCP_BROWSER` — `tab` for the default browser, or the name or path of
  an executable to use in app mode
- `JISCRIBE_MCP_NO_OPEN` — set to anything to just return the URL
- `JISCRIBE_MCP_VIEWER_ROOT` — serve the viewer from another directory

The host's lifetime follows the window: once the last viewer closes and none
comes back within a few seconds, it shuts down and releases the port.
