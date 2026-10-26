# @jiscribe/cli

The `jiscribe` command: checking, measuring, diagnosing, drawing and editing
`.jis` documents from a shell. A thin mouth on [`@jiscribe/doc-tools`](../../packages/doc-tools),
so a person, a CI job and an AI agent are told the same things about a document
that the editor would tell them.

```bash
pnpm build:cli
node engine/apps/cli/dist/index.mjs --help
```

## Commands

```
jiscribe validate <files...>   read it with the canvas parser; exit 1 on any error
jiscribe diagnose <files...>   validate, then report text overflowing its shape
jiscribe measure  <text>       how a string lays out in a given box
jiscribe render   <file>       draw the document to a .png or .svg
jiscribe preview  <file>       write the document into one HTML file that draws it
jiscribe tools    [<tool>]     list the editing tools, or describe one
jiscribe op       <file> ...   run editing tools on the document, writing it back once
jiscribe guide    <name>       print the drawing guide or the file-format guide
```

`validate` / `diagnose` / `measure` print one finding per line
(`<severity> <file> <objectId> <message>`) and take `--json` for the same content
as one object. Globs are the shell's: `jiscribe validate 'diagrams/**/*.jis'`.

## render

```
jiscribe render <file> -o <out.png|out.svg>
    [--scale <n>]                 output pixels per logical px (PNG only, default 1)
    [--region content|viewbox]    default content
    [--background <css color>]    a colour, or "transparent"
    [--browser <channel|path>]    which Chromium to drive
```

The format comes from the output extension. The document is validated first: a
file the canvas would refuse to open is not worth a browser launch, and the
diagnostics say more than a blank image would.

### It draws with the real canvas

`render` loads a self-contained page carrying the Canvas component and every
shipped shape plugin (`standardPlugins`), then asks it for the image through the canvas's own export
handle. The drawing is therefore not a second implementation of the rendering
that could drift from the editor's — it _is_ the editor's rendering, in a browser
with no window. That also means viewport culling is suspended for the snapshot,
so a diagram far taller than any screen comes out whole.

### A browser is needed, and none is shipped

One Chromium per platform is larger than everything else here put together, so
`render` drives one the machine already has, through `playwright-core`. It tries,
in order: the browser `--browser` names (a channel such as `chrome` / `msedge`,
or a path to an executable), then the `chrome` channel, then `msedge`, then
playwright's own downloaded Chromium. Finding none, it says what to install.

`playwright-core` is imported only when `render` runs, so every other command
works on a machine with no browser at all.

### The output is repeatable

Two renders of one document give byte-identical files. What it takes:

- **Fonts are waited for.** Faces are fetched per unicode-range as text needs
  them, so `document.fonts.ready` before the first paint means nothing. The page
  mounts the document, waits for the fonts that mounting requested, then mounts it
  _again_ — the second pass is the one measured with the real faces present, which
  matters for every box whose size is derived from its content.
- **The browser is launched to be boring**: hinting and subpixel positioning off,
  sRGB forced, GPU off.

Repeatability is per machine. A different Chromium build rasterizes glyphs
differently, so the bytes are only ever compared against themselves.

### The golden render

`render-tests/` holds a document sitting on the parts of the layout the unit
tests never look at — a shape whose `height` the document leaves out, a `text` in
the block layout, CJK with punctuation, a connector with a label — and the image
it draws. A run needs a build and a browser, so it is its own script rather than
part of `pnpm test`:

```bash
pnpm build:cli
pnpm --filter @jiscribe/cli test:render
```

The comparison is exact on the pixel size and tolerant on the pixels themselves
(under 0.5% of them may differ by more than 32 in luminance), which is room for
another Chromium's glyphs and not for a layout that moved — see the header of
`render-tests/golden.test.ts` for the measurements behind the number and for how
to regenerate the image when the drawing changes on purpose.

### Fonts are served from node_modules, not bundled

The shipped stacks split into some 1700 files by unicode-range (Noto Sans JP
alone is 125 subsets per weight) — around 50 MB beside a 600 KB CLI. So the build
rewrites every `url()` in the stylesheets to a `/fonts/<name>` path and records
which package it came from (`dist/harness/fonts.json`); at render time those
paths are answered out of `node_modules` through playwright's request
interception. The browser fetches only the ranges a document actually draws.

The consequence is the same one `@jiscribe/doc-tools` carries: **the repository's
`node_modules` has to be present**. A standalone distributable is not supported
yet.

## preview

```
jiscribe preview <file> -o <out.html>
```

One HTML file holding the document, the canvas, every shipped shape plugin
and the toolbar — so the drawing can be panned, zoomed and edited by whoever
opens it, with no server, no install and no checkout. Nothing is saved: the file
is a copy of the document at the moment it was written, and closing the tab
discards whatever was done to it.

Where `render` sends the canvas a document and takes a picture back, `preview`
writes the canvas into a file and lets a browser elsewhere run it. It needs no
browser itself, which is what makes it usable from a machine that has none — a
CI job, a container, an agent working in the cloud.

### What travels, and what does not

The page is assembled at build time, not at preview time: `buildPreview.mjs`
bundles `preview/main.tsx` into `dist/preview/`, and the command wraps a
validated document around it. Everything is inlined — react, the canvas, the
shape set, katex's stylesheet with its faces as data URIs — with one exception.

The shipped font stacks are the exception, for the reason they are served from
`node_modules` for `render`: 1700 subset files do not fit in a file meant to be
mailed. The page asks Google Fonts for the same seven families instead
(`preview/previewBridge.ts`), which is the one stylesheet host a page can rely on
reaching. A machine that cannot reach it still gets the drawing, on the fallback
faces each stack ends in — and, because a box derived from its content is
measured against the family the document names, a slightly different one.

That single external request is also what keeps the file publishable as-is on a
host that forbids everything else: the output loads no script, no image and no
stylesheet from anywhere but `fonts.googleapis.com`.

## tools / op / guide: editing from a shell

These are jiscribe-mcp's document tools without the MCP server. Both read the
same `@jiscribe/ai-tools` declarations over the same shipped shape set, so a
tool's name, its arguments, its description and the text it replies with are
the ones an MCP client sees — what an agent learns in one place holds in the
other. What jiscribe-mcp adds of its own (`path`, `open_canvas`, the viewer) is
replaced here by the file argument.

### tools

```
jiscribe tools [--json]          every tool `op` runs: name and first sentence
jiscribe tools <tool> [--json]   its whole description and its argument JSON Schema
```

Only the tools a document alone can answer are listed. The ones that act on a
canvas drawn on screen (`capture_canvas`, `select_objects`, `fit_view`, ...) need
a viewer and exist only in jiscribe-mcp; naming one is refused with that reason.
The schema is closed (`additionalProperties: false`), as the arguments are.

### op

```
jiscribe op <file> <tool> [--args <json | @path | ->] [--create] [--text]
jiscribe op <file> --batch <@path | -> [--create] [--text]
```

`<file>` is relative to the working directory or absolute, and must carry a
canvas extension (`.jis`, `.jis.json`, `.jiscribe`, `.jiscribe.json`). `--args`
is the tool's arguments as one JSON object, `{}` when left out; `@path` reads it
from a file and `-` from stdin.

A batch is a JSON array of entries, run in order:

```json
[
	{
		"tool": "add_object",
		"args": { "type": "rect", "x": 0, "y": 0, "text": "API" },
		"as": "api"
	},
	{
		"tool": "add_objects",
		"args": {
			"objects": [
				{ "type": "db", "x": 300, "y": 0 },
				{ "type": "rect", "x": 300, "y": 200 }
			]
		},
		"as": "back"
	},
	{ "tool": "connect", "args": { "sourceId": "$api", "targetId": "$back.0" } },
	{ "tool": "set_text", "args": { "id": "$back.1", "text": "$$5 a month" } }
]
```

- An entry is `tool`, optional `args` and optional `as`; any other key is refused.
- `as` names the ids the entry creates. In the `args` of a **later** entry, a
  string that is exactly `"$name"` becomes the first id it created, and
  `"$name.N"` the N-th (from 0) — at any depth, inside arrays and objects, but
  never part of a longer string and never an object key. The order is the
  order of creation: `add_objects` lists its objects as given, with the group
  `groupNewObjects` made last.
- A string starting with `$$` loses one `$` and is not read as a reference
  (`"$$5 a month"` is written as `$5 a month`). A string starting with one `$`
  that is not a reference in form (`$5`, `$a.b`) is passed as it is.
- `as` is an identifier (`[A-Za-z_][A-Za-z0-9_]*`) and used once per batch. A
  reference naming no earlier entry, an entry that created nothing, or an
  index past what it created fails its entry.
- References are a batch's only. A single tool's `--args` is passed as given,
  `$` and `$$` included.

The file is read once, every entry applied to it in memory, and the result
written back once — only if some entry changed the document, so a read-only
tool never touches the file. **The first entry that fails ends the run and
nothing is written**, whatever ran before it. The write-back goes through the
same check as jiscribe-mcp's: it is refused when the edit would add a finding
`jiscribe validate` does not already report for the file, or when the file was
changed by something else meanwhile. Text overflowing its shape is not part of
that check; run `jiscribe diagnose` for it.

Without `--create` a missing file is a failure. With it, a missing file starts
as an empty document and is created by the write-back, so a run that fails
leaves no file behind. An existing file is loaded as without `--create`. If a
file appears at the path while the run is applying its entries, the write-back
is refused and that file kept (the check sits right before the rename, so it
narrows the window rather than closing it).

`undo` is not offered: each run is a process of its own and keeps no history
between runs. Take a change back with git.

The output is one JSON object on stdout:

```json
{
	"ok": false,
	"written": false,
	"file": "/abs/path/diagram.jis",
	"results": [
		{
			"tool": "add_object",
			"as": "api",
			"ok": true,
			"text": "added rect \"rect-1\" at (0, 0)",
			"createdIds": ["rect-1"]
		},
		{ "tool": "set_position", "ok": false, "text": "error: ..." }
	],
	"error": { "index": 1, "tool": "set_position", "message": "..." }
}
```

`results` has one entry per batch entry that reached its tool, `text` being
exactly what jiscribe-mcp replies for that call. An entry refused before that
(unknown or screen tool, bad reference, arguments the schema rejects) appears
only in `error`, which also carries a failure of the run as a whole (the file,
the input, the write-back) with no `index`. `--text` prints the same as lines:
one per result, then the error, then `written <file>` or `not written <file>`.
In both forms, control characters other than newline and tab are written as
`\uXXXX` (inside the JSON's strings, so it stays valid JSON), so text out of a
document cannot drive the terminal.

Exit codes: 0 when everything succeeded, 1 for a failure (a tool's error, a bad
reference or argument, a refused write-back, a missing file), 2 for a malformed
command line.

### guide

```
jiscribe guide drawing       how the canvas works and how to draw well with the tools
jiscribe guide json-format   the .jis file format, for writing a document by hand
```

The two guides jiscribe-mcp's `read_drawing_guide` hands back, read from
`@jiscribe/doc-schema` at run time. A missing or empty guide is an error (exit 1)
rather than empty output: it means the installation is incomplete.

## Known limits

- `--region viewbox` means the harness page's own 1280x800 view. A document can
  declare how it is presented (`view`, set with `set_document_view`), and
  `render` honours its `view.padding` around the content, but `viewbox` ignores
  the declared framing. `content` is the default and is what a file being
  handed to someone else wants.
- A connector label paints its own box in the theme's colour, so `--background`
  with a strongly tinted colour leaves the labels sitting on white. That is the
  canvas's drawing, not the render's.
- `--scale` is refused for SVG rather than ignored: an SVG carries no pixels.
- A `preview` cannot save. The canvas's own PNG / SVG export is in the toolbar
  and works, but a page served under a sandbox that blocks downloads (an artifact
  host, for one) will let the click do nothing — that is the host's rule, not the
  page's.
