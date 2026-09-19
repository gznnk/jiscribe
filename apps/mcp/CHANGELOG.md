# Changelog

All notable changes to the `jiscribe-mcp` server are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below 1.0, the tool set and the viewer may change between
minor releases.

What is recorded here is this server's own surface: its tools, the viewer, and
how it is registered. The canvas it draws on — the shapes, the styles, what a
`.jis` file can hold — moves with the engine, and the
[release notes](https://github.com/gznnk/jiscribe/releases) cover that.

## [Unreleased]

### Security

- **The viewer's host checks who is talking to it.** It answered any page a
  browser had open: a WebSocket from another origin was handed the open
  diagram in full and could answer the AI's on-screen queries (capture,
  selection, measurement) with whatever it liked, and a page that had rebound
  its DNS name to `127.0.0.1` could write any file under the diagram's
  directory through the file API. Now the `Host` header has to be one of
  `localhost` / `127.0.0.1` / `[::1]`, an `Origin` has to be the host's own,
  and every WebSocket and every write carries a session token the page
  fetches from the new `GET /api/session`. Writes are accepted only for the
  file on display and are capped at 16 MiB; image responses carry a sandbox
  CSP so an SVG in the workspace cannot run script on the host's origin; the
  workspace boundary is checked through `realpath`, so a symbolic link cannot
  lead a read or a write outside it.
- **Every tool that takes `path` applies the same rule.** The 46 document
  tools from `@jiscribe/ai-tools` accepted a relative path and resolved it
  against the MCP process's working directory, while `add_rect` and
  `diagnose_canvas` refused the same argument. All of them now require an
  absolute path naming a `.jis` / `.jis.json` / `.jiscribe` /
  `.jiscribe.json` file, so a tool can no longer be talked into creating or
  overwriting a file of another kind. **This is a breaking change**: a prompt
  or client that passed a relative path, or a file not named that way, is
  refused.
- The viewer's write is parsed as a canvas document before it lands, the way
  the tools' writes are, and refused with 422 otherwise.
- A malformed `Host` header no longer takes the MCP process down (the URL was
  built outside the handler's error path). The temporary file an atomic write
  goes through is created with the destination's own mode rather than the
  umask default.

### Fixed

- **An object of a type this server does not ship survives an edit.** A
  shape from a plugin the server lacks, or from a newer version, was dropped
  from the file by any tool that wrote it back — `add_rect` replied only
  `added rect ...` — and `undo` could not bring it back, since the history
  held the document without it; saving from the viewer lost it the same way.
  Only `diagnose_canvas` said so, as "will be dropped on save". Such an object
  is now kept exactly as written, in its place among its siblings, through
  every tool, `undo` and the viewer. The viewer does not draw it, and a
  connector attached to it is kept too, undrawn. `list_objects` and
  `find_objects` show it flagged `unknownType`, with the box its
  `x` / `y` / `width` / `height` state; `delete_objects`, `reorder_objects`
  and the group tools act on it, while a tool that would edit what is inside
  it (moving, resizing, styling) refuses or skips it and says why.
  `diagnose_canvas` now reports it as `Object type "…" is not a type this
build knows: the object is kept as it is but not drawn.`, beside the schema
  error its type still draws.
- **A tool no longer leaves a file that `diagnose_canvas` rejects.** A call
  could succeed and write something the parser lets through but the schema
  forbids: `add_object` / `add_objects` stored a `text` on `lucideIcon`,
  `polygon` and `polyline` (the very types `set_text` and `get_text` call
  textless), and `set_text_style` turned a markdown body into styled runs
  where the schema, and the renderer, take a plain string only. Both are now
  refused with an error naming why, and the file is left as it was. Behind
  them, every write-back runs the validator `diagnose_canvas` runs and refuses
  a document carrying an error the file did not have when the tool read it.
  The comparison is against the file as it was, so one already failing the
  schema for a reason of its own (a key the format does not know) stays
  editable, and what it held is written back untouched. The check costs one
  validation per write — about 15 ms at 200 objects and 140 ms at 2,000 — and
  a second one only when the file holds contents this server has not seen
  (the first edit of it, or one after someone else wrote it).
- **A person's edit and a write from elsewhere to the same file both land.**
  A write from the AI or another window replaced the viewer's document
  outright: a drag still inside the 500 ms save debounce, or an edit whose
  save had failed, was drawn over and never reached the file; and any write —
  even to an object nobody was touching — closed the text editor and cut off a
  drag in progress, so typed text and the drag went nowhere. The viewer now
  merges the edits the file does not hold yet onto the newer file, object by
  object at every depth, with group membership, stacking order and the
  document's own fields (background, view) merged apart; the result is drawn
  and written under the newer revision. Where both sides changed the same
  object, or one deleted what the other changed, the file wins and a notice
  names what of the person's was not saved — by the text on the object, or
  its type where it has none, rather than by its id (a UUID for a pasted
  object), and as a count past three. That notice, like the one for an edit
  lost to a file switch, goes on its own after six seconds: it reports
  something that happened, and left in the error bar it stayed up for good
  once nothing more changed, looking like a failure still going on. The error
  bar is kept for what lasts until it is resolved — a broken or missing file,
  a write that failed. While a drag, a resize or the
  text editor is under way, a newer file is held back and taken in once the
  person lets go. A save refused because the file had moved on (412) is no
  longer reported as lost: the newer file follows, and the edit is merged
  onto it.
- **An edit whose save failed on the way is sent again.** When the viewer's
  write did not reach the host (the network dropped, the host was restarting
  or answered with a 5xx), the error bar said so but nothing ever sent the
  edit again, even after the connection came back; and the next change to the
  same file from outside drew over the edit and cleared the error, so it was
  lost without a word. The viewer now remembers edits the file does not hold
  yet, sends them again on a backoff (1 s doubling to 10 s) and at once when
  its connection comes back, and says so in the error bar while it does. A
  refusal about the write itself — a conflict, a host restarted since (401),
  another file on display (409), a file that may not be written to (now 403
  rather than 500), an invalid document — is shown and not sent again.
- **A file put back as it was brings the viewer back.** When a `.jis` that
  had been broken, deleted or unreadable was restored byte for byte (an
  editor or git rewriting the same content, a writer caught half way through
  by the host's poll), the viewer took it for its own save coming back: the
  error stayed up for good, and after a broken file every edit made in the
  page was quietly never saved, until the next change from outside threw
  those edits away. The same text after such an error now clears it, and
  edits made in the meantime — made on that very text — are written out. A
  broken file replaced by different content draws that content, with the
  edits made while it was broken merged onto it. The host also
  sends a file that went missing and came back with its old content, which it
  used to hold back as already known.
- **One file named two ways is one file.** The per-file lock and the undo
  history were keyed by the path as written, so a file reached both directly
  and through a linked directory (`/tmp` against `/private/tmp` on macOS, a
  symlinked project) was two files to the server: parallel additions through
  both spellings all reported success while about half of them were lost, and
  `undo` through the other spelling found nothing to take back. Every `path`
  is now resolved through its symbolic links, and that is what is locked,
  remembered, read and written. A `.jis` that is itself a link is updated
  where it leads instead of being replaced by a plain file, and a
  canvas-named link to another kind of file is refused rather than read.
- **A malformed WebSocket frame no longer kills the server.** A frame the
  viewer's host could not accept (one over 16 MiB, a bad opcode, text that is
  not UTF-8) was raised as an uncaught error, taking the host, the undo
  history and the MCP session down together. Such a socket is now closed on
  its own and everything else keeps running.
- **A read-only `.jis` is no longer overwritten.** A write replaces the file
  by renaming a temporary one over it, which only the directory's permission
  governs, so a file made read-only was replaced all the same. It is now
  refused with `EACCES`, as a direct write would be.
- **`undo` takes back `add_rect` and `add_ellipse`.** They wrote around the
  undo history, so an `undo` after either was refused as "the canvas changed
  after your last edit", and the steps before it were out of reach as well.
  Both now go through the same path as `add_object`; `add_ellipse` reports the
  center it was given alongside the top-left the document holds.
- A write-back that failed (a full disk, a read-only directory) left the undo
  history one step ahead of the file, refusing every later `undo` for the
  same reason. The history is put back when the write fails.
- Two `open_canvas` calls arriving together could start two hosts and leave
  one running with nothing pointing at it; the two tools that own the host now
  run one at a time.
- **A person's save reaches the other windows.** The host recorded it only to
  cancel its own echo, so a headless window the AI looks through, or a second
  tab, kept drawing the diagram as it was before the edit and `capture_canvas`
  returned a stale picture.
- **Edits a person is still holding are written out before the file on
  display changes.** `open_canvas` on another file (or another directory) now
  asks every window to save first and waits for the answers, instead of moving
  on while a debounced save was on its way and refusing it. `close_canvas`
  likewise waits for a write already in flight.
- **Switching to a file in another directory no longer opens a second
  window.** The window the previous host had reconnects on its own, so the new
  host waits for it before deciding to open one, visible or headless.
- **Opening a second new file in the same directory left the viewer on the
  first.** Two freshly created files hold the same empty canvas, and the viewer
  took the second's text for the echo of its own save; from then on its saves
  named the first file and were refused. It now checks the file name as well.
- **Ctrl+Z after switching to a same-named file in another directory no
  longer writes the previous file into it.** The viewer knew a document by its
  path relative to the directory served, which a file of the same name in
  another directory shares, so the canvas kept the previous file's undo
  history and an undo wrote that file's content over the new one. A document
  is now also known by the host that sent it (its session token), and the
  viewer writes it back to that host alone; a reconnect to the same host keeps
  the history.
- **A drag released as `open_canvas` moves to another file no longer lands in
  that file.** The canvas hands a commit over a frame or two after the release,
  which could be after the viewer had answered the host's flush and taken the
  next file; the debounced save then wrote the previous file's objects into the
  new one (same directory), or was refused (another directory). The viewer now
  waits for the canvas to hand over what it is holding before it answers the
  flush, so the edit reaches its own file; one that still arrives after the
  switch is not written anywhere and the error bar names the file it was lost
  from. A drag still held when the flush comes is given up to 1.5 seconds to be
  let go and is then saved the same way. What the switch still takes — text
  being typed in the editor, a drag held past that, which the canvas drops as
  it takes the next file — is named in the error bar as well instead of
  vanishing, and an edit the host refuses because the page's file is no longer
  on display (or, across directories, because it came from the host that has
  gone) reads as that same one message rather than a raw "invalid session
  token" ahead of it.
- **A person's save and the AI's write no longer overwrite each other
  unnoticed.** The viewer's write carried no version and bypassed the lock
  the tools take, so whichever landed last won and the other edit vanished.
  Every `openCanvas` / `docChanged` frame now carries the file's revision
  (its SHA-256), the write names it in `If-Match`, and the host checks it
  under the same per-file lock: a save behind the file is refused with 412
  and the window takes the newer document. The `saved` frame is gone; the
  host broadcasts the change itself.
- Two `open_canvas` calls on different files arriving together could leave
  the host showing one file while watching the other; opening is now
  serialised. Two headless opens arriving together no longer start two
  browsers.
- The viewer keeps its window when the canvas throws while drawing (a headless
  one closes itself, since nobody can see the message), refuses to save while
  the file on disk does not parse (an outside editor mid-edit would have been
  overwritten with the last good document), and draws its error bar in the
  canvas theme's colours instead of a fixed dark scheme.
- The URL `open_canvas` returns is `http://127.0.0.1:<port>`, the address the
  host binds, rather than `localhost`.
- The throwaway profile a headless browser runs on is created by the host
  (`mkdtemp`, owner-only) and records its owner; profiles left behind by a
  killed server of any pid are swept, not only those of the current one.
- The published package carries its `LICENSE`; `--watch` builds stage the
  runtime files `diagnose_canvas` and text measurement read; the inlined
  viewer script escapes `<!--` as well as `</script`.
- A `HEAD` request is answered as `GET` is, without the body, wherever `GET`
  is served (the viewer page, its fonts, an image, the session token); it
  used to be a 404.

### Changed

- **A viewer window left open from 0.10.0 or earlier cannot reconnect to this
  release.** It carries neither the session token nor the revision the host now
  demands. Close it; `open_canvas` opens a new one.
- **The host waits an hour, not five seconds, for a viewer to come back.** A
  browser puts a window left in the background to sleep and the page reconnects
  only when the person returns to it; by then the host had shut down and the
  canvas had to be opened again. The port is still released when the MCP client
  disconnects or on `close_canvas`.

## [0.10.0] - 2026-09-14

The AI can now fetch the drawing guide instead of being expected to know it, and
it can be given a canvas to look at without a window appearing on anyone's
screen. Validation has one entry point rather than two.

### Added

- **`read_drawing_guide` hands over the prose the tool declarations cannot
  carry** — `"drawing"` for what the canvas holds and how to draw on it well,
  `"json-format"` for editing a `.jis` file directly rather than through the
  tools. It is fetched on demand because it is far too large to sit in the
  context for a whole session.
- **The handshake carries `instructions`.** They describe this server alone —
  that files are named by absolute path, which tools need a viewer, where
  validation starts, how far `undo` reaches — and deliberately leave the canvas
  itself to the guide above.
- **`open_canvas` takes `headless`.** With `headless: true` it opens a
  window-less Chromium, so the 16 screen-side tools have something to work with
  while the user's screen stays as it is. It names a Chromium executable
  directly and never falls back to a browser tab, since no default browser has a
  headless mode; with none installed it says so rather than leaving the AI blind.
  A headless window counts as a viewer for the host's lifetime, and a later plain
  `open_canvas` still puts a visible window up.
- **Registration for Codex and GitHub Copilot** alongside Claude Code, in the
  README. Note that VSCode calls the server map `servers` where everyone else
  calls it `mcpServers`.

### Removed

- **`validate_canvas`.** Use **`diagnose_canvas`**, which takes the same `path`
  and reports everything the old tool did plus the drawing problems a schema
  cannot see, such as text overflowing its shape. `validate_canvas` took the
  whole document as an argument, which spent context to say less. **This is a
  breaking change**: a client pinned to 0.9.0, or a prompt that names the tool,
  will not find it.

### Changed

- Tool descriptions and messages say `.jis` throughout. The longer spellings
  (`.jis.json`, `.jiscribe`, `.jiscribe.json`) are still read.
- The bundled guides carry the version they were generated at, so a client can
  tell a newer set from an older one.
- The tool count is unchanged at 69 — `read_drawing_guide` takes the place
  `validate_canvas` left.

## [0.9.0] - 2026-08-30

First release on npm.

An MCP server that hands the Jiscribe canvas tool set to an AI over stdio and
opens a local viewer beside it, so a person can watch a drawing take shape and
correct it by hand while the AI works. The `.jis` file on disk is the only
source of truth: the AI edits it through tools that name a path, the host
mirrors it into the viewer, and anything a person changes there is written back
for the AI's next read.

69 tools in three families — seven of the server's own, 46 that a document alone
can answer, and 16 that only a canvas on screen can. The viewer opens as a
Chromium app-mode window and the host's lifetime follows it.

Node 22 or newer is all that is required: the published package carries the
server, the viewer, and the files the text measurement needs at runtime.
