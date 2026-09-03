# @jiscribe/cli

The `jiscribe` command: checking, measuring, diagnosing and drawing `.jis.json`
documents from a shell. A thin mouth on [`@jiscribe/doc-tools`](../../packages/doc-tools),
so a person, a CI job and an AI agent are told the same things about a document
that the editor would tell them.

```bash
pnpm build:cli
node engine/apps/cli/dist/index.mjs --help
```

## Commands

```
jiscribe validate <files...>   schema + parser; exit 1 on any error
jiscribe diagnose <files...>   validate, then report text overflowing its shape
jiscribe measure  <text>       how a string lays out in a given box
jiscribe render   <file>       draw the document to a .png or .svg
jiscribe preview  <file>       write the document into one HTML file that draws it
```

`validate` / `diagnose` / `measure` print one finding per line
(`<severity> <file> <objectId> <message>`) and take `--json` for the same content
as one object. Globs are the shell's: `jiscribe validate 'diagrams/**/*.jis.json'`.

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

`render` loads a self-contained page carrying the Canvas component and all eight
shipped shape plugins, then asks it for the image through the canvas's own export
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

`playwright-core` is imported only when `render` runs, so the other three
commands work on a machine with no browser at all.

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

One HTML file holding the document, the canvas, the eight shipped shape plugins
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

## Known limits

- `--region viewbox` means the harness page's own 1280x800 view, not a camera
  stored in the document — a `.jis.json` holds no camera. `content` is the
  default and is what a file being handed to someone else wants.
- A connector label paints its own box in the theme's colour, so `--background`
  with a strongly tinted colour leaves the labels sitting on white. That is the
  canvas's drawing, not the render's.
- `--scale` is refused for SVG rather than ignored: an SVG carries no pixels.
- A `preview` cannot save. The canvas's own PNG / SVG export is in the toolbar
  and works, but a page served under a sandbox that blocks downloads (an artifact
  host, for one) will let the click do nothing — that is the host's rule, not the
  page's.
