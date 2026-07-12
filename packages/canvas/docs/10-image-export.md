> 🌐 日本語版: [10-image-export.ja.md](./10-image-export.ja.md)

# 10. Image Export / Round-trip (PNG / SVG)

Exports the canvas as an image in the browser. The goal is to **embed diagrams
in Markdown (VSCode preview and GitHub) while keeping them re-editable** —
the equivalent of draw.io's editable SVG / PNG. GitHub issue: #55.

## Background: the foreignObject constraint

Shape text is rendered by `TextOverlay` as `<foreignObject>` + HTML (for
Markdown rendering and rich editing). As-is, this blocks imaging:

- **PNG**: drawing an SVG that contains `<foreignObject>` onto a canvas via
  `<img>` marks the canvas **tainted** — even with no external resources or
  fonts — and `toBlob` / `toDataURL` fail with `SecurityError` (confirmed in
  Chromium).
- **GitHub and similar**: Markdown renderers sanitize `<foreignObject>` out of
  SVG, hiding the text.

→ With foreignObject intact, neither PNG conversion nor GitHub display works.

## Design

From the live `<svg>`, a **self-contained export SVG** that renders and
rasterizes anywhere is built once and shared by both the SVG download and the
PNG rasterization:

```
buildExportSvg(liveSvg, { source }) ─┬─ serializeSvg ─→ .jis.svg download
                                     └─ <img>→canvas→toBlob ─→ iTXt embed ─→ .jis.png download
```

What `buildExportSvg` (`src/export/buildExportSvg.ts`) does:

1. `cloneNode(true)` the live SVG
2. **Bake computed paint styles into the clone**: shape paint is applied via
   emotion classes and theme custom properties (`var(--jiscribe-*)` on the
   Canvas root — issue #38 / doc 08), neither of which survives standalone
   (serialized SVG loses the class rules; a detached tree cannot resolve the
   custom properties, so `fill` falls back to its initial value = **black**).
   fill / stroke / opacity / color are copied from the live computed style
   into inline styles, paired by tree order, and `class` attributes are
   dropped.
3. **Convert foreignObject → native `<text>`** (`foreignObjectToSvgText.ts`)
   - Word-wraps with real font widths via `canvas.measureText` (long words and
     CJK break per character)
   - Reproduces text-align → `text-anchor`, vertical-align → block placement,
     color / font / line-height / padding from the computed style
   - Wraps the result in a `<g>` with the same `transform` (matrix), keeping
     position, rotation, and scale
   - **Baselines follow the CSS inline layout model**: the font's content box
     (`fontBoundingBoxAscent/Descent` from TextMetrics) is centered in the
     `line-height` box by half-leading, and the baseline sits at
     `halfLeading + ascent`. This keeps the exported text within ~1px of the
     on-screen rendering (HTML pixel-snaps glyphs, SVG does not — that
     sub-pixel difference is the remaining floor).
   - Markdown is **flattened** via `innerText` (tables, lists, and other rich
     decorations are not reproduced)
4. Remove everything marked `data-canvas-export="exclude"` — the single
   opt-out token for image export (control overlays, the grid, ...)
5. Lay the background color as a solid `<rect>` covering the viewBox
6. Embed `source` (`CanvasDoc` = the `.jis.json` content) into `<metadata>`
   under the jiscribe namespace `https://jiscribe.dev/ns/canvas`
   (`canvasSourceMetadata.ts`)

With paint baked inline and text attribute-based through the `<text>`
conversion, the file no longer depends on the document (CSS classes, custom
properties, foreignObject), so it renders anywhere and the PNG no longer
taints.

**Fit-to-content**: the exported region is the whole content's bounding box
plus a margin (default 16px, `EXPORT_FIT_PADDING` in `Canvas.tsx`; the export
dialog and `CanvasExportOptions.margin` can override it), computed via
`calcContentBounds` — the same bounds source as zoom-to-fit — and passed as
the `viewBox` export option. The image is therefore independent of the current
pan/zoom and window size; 1 world unit = 1 CSS px (PNG additionally ×`scale`,
default 2). An empty canvas falls back to exporting the current view.

## PNG round-trip (iTXt)

The exported PNG embeds the `.jis.json` as an **`iTXt` chunk** (keyword
`jiscribe`), draw.io style: the file stays a plain image everywhere, while
jiscribe can reopen it for editing.

- `iTXt` is chosen over `tEXt`/`zTXt` because the JSON contains Japanese
  labels and `iTXt` is natively UTF-8. The chunk is written **uncompressed**
  (the JSON is small; skipping zlib keeps extraction synchronous and
  dependency-free).
- The chunk is inserted right before `IEND` with a table-based CRC32
  (`pngChunks.ts`). Re-embedding under the same keyword replaces the existing
  chunk (idempotent).
- Extraction returns the **raw JSON text**, not a parsed doc: a PNG is
  external input, so hosts must run it through `parseCanvasText` (two-stage
  validation at the boundary — design philosophy principle 4).

The demo app accepts a drop of an exported PNG and replaces the canvas with
the restored document (`App.tsx`).

## VSCode integration (`.jis.png` / `.jis.svg`)

The VSCode extension binds its canvas editor to the double extensions (like
draw.io's `.drawio.png`): opening such a file restores the document from the
embedded source, and saving re-renders the image with the updated source
re-embedded, so the file always stays a valid, current image.

- Both `.jis.png` and `.jis.svg` are handled by a dedicated
  `CustomEditorProvider` (`JiscribeImageEditorProvider`) that manages dirty
  state, undo/redo, save, and hot-exit backups. Commits from the webview
  always carry the doc JSON; the image itself is rendered only at save time
  (`CanvasExportHandle.toPngBlob` / `toSvgString` via `requestImageExport`),
  so the commit path never depends on DOM rendering. If the webview cannot
  respond, save falls back to re-embedding the current source into the
  last-saved image (stale pixels, but edits are never lost).
- The Node side reads/writes the embedded source via the UI-free entries
  `@workspace/canvas/png-source` (iTXt chunk) and
  `@workspace/canvas/svg-source` (`<metadata>` text manipulation, no DOM) —
  same pattern as `./parser`.
- `<Canvas exportRef>` exposes the imperative export API
  (`toSvgString(options?)` / `toPngBlob(options?)`, both taking
  `CanvasExportOptions` with an optional `margin`, `includeSource`, and
  `transparentBackground`) so hosts run the exact same pipeline as the
  export dialog.

## Public API (`@workspace/canvas`)

| Function                                                | Role                                   |
| ------------------------------------------------------- | -------------------------------------- |
| `exportCanvasToSvg(svg, { source, fileName })`          | Download editable SVG (`.jis.svg`)     |
| `exportCanvasToPng(svg, { source, scale, fileName })`   | Download PNG (with embedded source)    |
| `canvasToSvgString(svg, { source })`                    | Get the self-contained SVG string      |
| `rasterizeSvgToPngBlob(svg, options)`                   | Get the PNG Blob                       |
| `buildExportSvg` / `serializeSvg`                       | Low-level build / serialization        |
| `embedCanvasSource` / `extractCanvasSource`             | `.jis.json` in/out of SVG `<metadata>` |
| `embedCanvasSourceInPng` / `extractCanvasSourceFromPng` | `.jis.json` in/out of PNG `iTXt`       |

UI: **context menu → Export…** opens a dialog (`ui/menu/ExportDialog/`) to
pick the format (PNG / editable SVG), the margin, whether to embed the
source data (default on), and whether to make the background transparent
(default off — maps to the `background: "transparent"` export option, which
skips the background rect; the PNG keeps its alpha), then confirm.
`Canvas.tsx` builds `source` with
`canvasToDoc(state, registries.objectMapper)` — omitted when the embed is
turned off — and routes the choices into the shared export options. The
default download name follows the source: `.jis.png` / `.jis.svg` with an
embedded source (the `.jis` marker means "re-editable"), plain `.png` /
`.svg` without.

## Verification

- Unit (vitest, `src/export/__tests__/`): iTXt structure, CRC32 known vector,
  UTF-8 round-trip, idempotent re-embedding, non-PNG rejection, and
  `parseCanvasText` acceptance of the extracted source.
- E2E (Playwright, `scenario/image-export-roundtrip.spec.ts`), driving the
  context-menu → dialog flow: PNG export → drop → shapes restored with
  identical ids/transforms; SVG export with a custom margin contains no
  `<foreignObject>`, reflects the margin in its viewBox, and its metadata
  passes `parseCanvasText`; a source-less export downloads as plain `.svg`
  with no `<metadata>`; a transparent export lays no background rect.
- Text position: live (red) vs converted (blue) ink bounding boxes measured
  per line — within 1px on all sides, identical wrapping.

## Future work

1. **Font embedding**: `@font-face` (data URI) + subsetting to remove
   viewer-side font differences (especially Japanese glyphs)
2. **Rich Markdown decorations** in `<text>` (headings, bold, lists, tables)
