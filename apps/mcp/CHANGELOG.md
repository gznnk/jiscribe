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
