# jiscribe-desktop

The Jiscribe MCP server as a desktop app. **A proof of concept**: no installer,
no tray, and the window shows nothing but the canvas viewer.

Where `jiscribe-mcp` is a process an AI client starts over stdio, this app runs
first and stays up. It serves the same tools over Streamable HTTP on
`127.0.0.1`, and AI clients connect to it by URL. Every client that connects
works on the same canvas: one host, one set of file locks, one undo history.
The viewer opens in the app's own window instead of a spawned browser, and
`open_canvas` with `headless: true` opens a hidden window of the app's own.

## Build and run

From the repository root, never from inside this directory:

```bash
pnpm build:mcp       # the viewer, guides and fonts are copied out of its dist/
pnpm --filter jiscribe-desktop build
pnpm --filter jiscribe-desktop start
```

`pnpm build:desktop` does the first two in one go, and
`pnpm --filter jiscribe-desktop dev` runs it from source (it still needs
`pnpm build:mcp` first). The build fails, naming `pnpm build:mcp`, when
`jiscribe-mcp` has not been built.

## Connecting an AI client

The endpoint is printed on startup and shown in the window:
`http://127.0.0.1:5191/mcp`, or the next free port up from 5191. For Claude Code,
put this in `.mcp.json`:

```json
{
	"mcpServers": {
		"jiscribe": { "type": "http", "url": "http://127.0.0.1:5191/mcp" }
	}
}
```

The endpoint listens on `127.0.0.1` only, accepts only requests addressed to
`127.0.0.1` or `localhost` on its own port, refuses any request carrying an
`Origin` header (a browser page's), and holds at most 64 sessions at once (a
session without an event stream is dropped after 10 minutes without a request,
or sooner to make room). There is no authentication beyond that: **any process
running as any user on the machine can connect** and use the tools, which read
and write canvas files and capture the canvas. Under WSL2 that includes
Windows-side processes, which reach WSL's loopback ports through
`localhost`.

The windows load only the pages the app puts in them: a link in a canvas opens
in the system browser, and pages are granted no permission but the clipboard.

## Windows and quitting

- **File → Open…** opens a canvas file in the window, the same as `open_canvas`.
- **Closing the window hides it**; the app keeps serving MCP. Starting the app
  again brings the window back instead of starting a second copy, showing the
  canvas again if one is still open.
- `close_canvas` closes the window as well, and the next `open_canvas` opens a
  new one.
- The hidden windows `open_canvas` with `headless: true` opens are closed once
  the last AI client has gone: when it ends its session, or when the event
  stream it holds open has been gone for 30 seconds. The main window is the
  person's and stays.
- `JISCRIBE_MCP_NO_OPEN`, which keeps `jiscribe-mcp` from spawning a browser,
  is ignored: the window is the app's own.
- **File → Quit** (Ctrl+Q, Cmd+Q on macOS) quits: the viewers are asked to close,
  the canvas host and the MCP endpoint are shut down, and the app exits.
