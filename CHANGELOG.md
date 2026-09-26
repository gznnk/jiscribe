# Changelog

All notable changes to the Jiscribe engine are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

What is recorded here is what moves with the engine as a whole: the `.jis`
format, the shapes, the canvas, the CLI and the packages under `packages/`. The
MCP server and the VSCode extension keep their own changelogs for their own
surface — [apps/mcp/CHANGELOG.md](apps/mcp/CHANGELOG.md) and
[apps/vscode-extension/CHANGELOG.md](apps/vscode-extension/CHANGELOG.md).

## [Unreleased]

### Security

- **Markdown no longer fetches the images it names.** `![alt](url)` in a
  `markdown` card became an `<img>` that the host requested, which was enough to
  tell the URL's owner that the file had been opened. `@jiscribe/markdown` now
  drops `<img>` when it sanitizes, so the same holds in every host that draws
  the card. Use the `image` shape to draw a picture; its `src` is read from
  beside the document.

### Added

- **Shift snaps the rotation handle to 15° steps.** Without Shift a rotation
  is still rounded to the whole degree and does not snap.
- **Shift adds to the selection as Ctrl and Cmd do**, and holding any of the
  three while dragging over the background adds what the marquee encloses to
  what was already selected instead of replacing it.
- **A `lucideIcon` can be a connector's endpoint.** The connector meets the
  icon's box rather than the drawing inside it.
- **The floating menu shows a mixed value as mixed.** It used to show the first
  selected object's value, so a red and a blue shape read as red. A colour
  swatch is now split between the colours (up to three), a slider's field is
  left empty, and no button of a set is pressed — the way the property sidebar
  already did.
- For plugin authors: `features.text: "source"`, for a shape whose body is
  source text it draws itself (as `markdown` now is). Such a body is a plain
  string, never runs, and carries no `fontWeight` / `fontStyle` /
  `textDecoration`; the canvas offers neither the emphasis controls nor
  Ctrl+B / I / U on it. `@jiscribe/doc` exports `TextType`, `textStyleKeysOf`,
  `isSingleBodyText` and `acceptsTextEmphasisStyle` to ask which styling a type
  takes, `OpaqueObjectDoc` for an object of a type the reader does not know,
  and `isSemanticError` / `isSemanticWarning`. `@jiscribe/canvas-sdk` exports
  `FRAME_BORDER_HIT_STROKE_WIDTH`, and `@jiscribe/geometry`
  `calcOutlinePointAlongLocalRayForRotatedEllipse` and
  `convertTransformedFrameToEllipse`.

### Changed

- **A property a shape does not have is reported, and dropped on save.** A
  misspelling, or a style a type does not take, used to be read without a word
  and then left out of what the canvas wrote back, so the value sat in the file
  looking as though it had taken effect. The parser now reports it as a warning
  and leaves it out of the document it returns; the document still opens. The
  same goes for a property inside a text run or slot, a polyline's point, a
  connector's endpoint, anchor or label, and at the document root, in `view`
  and in `view.padding`. **For plugin authors**, this makes a type's
  `extraKeys` the list of fields it keeps: a field missing from it is reported
  and dropped.
- **A broken value is refused rather than dropped.** An enum field holding
  something other than a string (`"textAlign": 1`) used to be dropped and the
  document opened without it; a text slot whose id is a plain number (`"0"`)
  used to vanish on load. Both now keep the document from opening, and
  `$schema` and `meta` (with its `name` / `description` / `reference`) are held
  to their types the same way. An enum field holding a string the format does
  not know is still dropped with a warning.
- **Older forms of a field are read and rewritten.** A `markdown` body written
  as styled runs is read as the runs' plain text, and a text written as an
  empty list of runs as no text (an empty string in a slot's row). Each is
  reported as a warning, and the next save writes the current form.
- **`markdown` carries no `fontWeight` / `fontStyle` / `textDecoration`.** Its
  body is Markdown source, so emphasis is written in the syntax (`**bold**`),
  and the card's own typography — `fontSize` / `fontColor` / `fontFamily` and
  the alignment — is the ground the whole body is drawn on. **This is a
  breaking change** to the file format: the JSON schema refuses the three keys,
  the parser reports them as unknown properties and drops them on save.
  Overflow diagnosis no longer measures a `markdown` card, since its body is not
  laid out by the shared typesetting it measures.
- **`jiscribe validate` checks with the canvas parser alone.** It no longer runs
  the JSON schema: the parser, the thing that opens the file, reports
  everything the schema did, so a finding is no longer reported twice in two
  spellings, and every `path` in `--json` output is the parser's
  (`root[3].width` rather than `/root/3/width`). An unknown property, an unknown
  enum value and an object of a type this build does not ship are now
  warnings, and a file carrying only warnings passes with exit code 0;
  `render` and `preview` draw such a file instead of refusing it. `text: []`
  is no longer refused (see above).
- **Pasting lands where you are looking.** A paste whose usual place, beside the
  original, is off screen goes to the middle of the view; pasting again while
  the copy is still selected steps on from it, as Duplicate does.
- **Stacking order and the aspect-ratio lock left the floating menu.** Both are
  in the property sidebar (the lock now also for a multi-selection and a
  group), and stacking order stays on the context menu and Ctrl/Cmd+`[` `]`.
- **For plugin authors**, three breaking changes to the canvas API:
  - The menu item `{ type: "fontStyle" }` is split into `{ type: "font" }`
    (family, size, colour) and `{ type: "textFormat" }` (bold, italic,
    underline, strikethrough); `"aspectRatio"` and `"stackOrder"` are no longer
    `BuiltinItemKey`s.
  - A `SemanticDiagnostic` must carry `severity` (`"error"` or `"warning"`),
    including those a type's own validator returns; there is no default.
  - `CanvasThumbnail` is removed. Render a `<Canvas>` and export it with
    `region: "viewport"` instead.

### Fixed

- **An object of a type this build does not know survives an edit.** A shape
  from a plugin the host lacks, or from a newer version, was dropped on load, so
  the next save removed it from the file. It is now kept as written, in its
  place among its siblings, and written back unchanged; the canvas does not draw
  it, and keeps a connector attached to it the same way. Validation reports it
  as a warning that the object is kept but not drawn.
- **A connector attaches to the inside of a `container` or `awsGroup`.** Both
  let clicks through their interior so the shapes inside stay selectable, and
  that also hid the interior from connector targeting, so their centre anchor
  could not be reached.
- **A connector on an ellipse's edge sits on its outline.** An edge anchor or
  connect point on an ellipse was placed on its bounding box; it now lands on
  the arc, as the centre anchor already did.
- **A `container`'s border is easier to grab.** Its hit area was the painted
  stroke, 1px at the default width and thinner zoomed out; it is now a 12-unit
  strip across the border, as `awsGroup` has.
- **Ctrl+wheel over the toolbar or a sidebar no longer zooms the page.** A
  trackpad pinch there did the same, Ctrl or not.
- **Editing text that overflows a fixed-size shape keeps the caret in view.**
  When editing began, and after a paste, the view moved to where the caret
  would be if the text were not clipped.
- A value inside `meta` whose key shares its name with an enum field
  (`meta.textAlign`, `meta.routing`) is no longer dropped as an unknown enum
  value; `meta`'s own contents are the host's.
- A slider label in the floating menu no longer wraps onto two lines.

## [0.10.0] - 2026-09-15

### Added

- **A property sidebar.** Layout, fill, line, arrows, text, arrange and meta,
  in collapsible sections that follow what is selected. A multi-selection shows
  only the rows every object has, and a row whose values disagree reads
  **Mixed**.
- **A shape library.** Every drawable shape in one searchable list: basic,
  flowchart, UML, containers, general, annotation, Lucide icons, AWS and AWS
  groups.
- **AWS Architecture Icons.** `awsIcon` draws any of 781 icons by name, with
  short names and aliases resolving and an unresolvable name coming back with
  suggestions; `awsGroup` draws the 19 boundary frames — VPC, subnet,
  availability zone, account — that they sit inside. They ship as
  `plugins/aws-shapes`, the ninth shipped plugin.
- **The canvas follows the editor's light and dark themes**, which is what lets
  each AWS icon pick its own rendition.
- **`image` draws a picture file** from beside the document. The bytes are not
  embedded, so the picture travels with the `.jis`; exports inline it so what
  you export still stands alone.
- **`fillOpacity` and `strokeOpacity`** dim a fill and an outline
  independently. The shape set is now **54 drawable types**.
- **A Claude Code plugin** (`apps/claude-plugin`): the MCP server and a drawing
  skill generated from the shape set, installable with
  `/plugin marketplace add gznnk/jiscribe`.

### Changed

- **The toolbar keeps six shapes** — rectangle, ellipse, polygon, polyline,
  text and sticky note; everything else is in the shape library.
- **The three text switches moved to the property sidebar** — auto height,
  fixed-width wrapping and the vertical basis — out of the floating menu.

### Fixed

- **Text no longer reflows shortly after a document opens.** The canvas asks
  for exactly the characters the document draws and holds the shapes back until
  those faces are ready, so the first frame you see is already measured in the
  face it is drawn in.
- Thirteen further fixes, among them paste inside a shape's text in VSCode, the
  canvas reacting to its own saves, an edit issued while the previous one was
  still being written, and a syntax error tearing the canvas down and losing
  where you were looking. The extension's
  [changelog](apps/vscode-extension/CHANGELOG.md#0100---2026-09-15) has the full
  list.

## [0.9.0] - 2026-09-03

### Added

- **Text sizes itself.** **Fit height to text** drops `height` from the
  document and derives it from the content; a `text` shape can be pinned to a
  width and wrapped; **Fit text to the full height** lines a row of differently
  shaped boxes up on the same baseline.
- **Fonts are bundled.** Sans, serif, monospace and handwriting, each at 400 /
  500 / 600 / 700 upright, with Japanese split by unicode-range so a document
  fetches only the ranges it draws.
- **`lucideIcon`** draws any of Lucide's 1767 icons by name, from a new Icon
  flyout and a searchable grid. The shape set is now 51 drawable types.
- **A document can declare how it wants to be opened** — a `view` object
  carrying padding, the fit on open, and whether panning is fenced to the
  content.
- **`apps/cli`** — `validate`, `diagnose`, `measure`, `render`, and a one-file
  `preview`.
- **`apps/mcp`** — an MCP server over the tool set, with a local canvas viewer
  that people can edit in while the AI works on the same file.
- **`packages/doc`** — the headless document layer (model, plugin contract,
  parser, ops, text metrics, `.jis.png` / `.jis.svg` I/O), split out of canvas.
- **`packages/ai-tools`** — the canvas operations an AI can call, declaration
  and application kept apart from any transport.
- **`packages/standard-shapes`** / **`packages/doc-tools`** — the shipped shape
  set bundled once for every host, and validate / measure / diagnose over it.

### Changed

- **Existing documents can look different.** Text is now drawn and measured in
  the bundled faces rather than whatever the viewer had installed, which changes
  glyphs, line heights, and anything sized from its content.
- **A new canvas is just an empty file.** Create one any way you already create
  files and open it.
- An open `.jis.png` / `.jis.svg` now follows edits made to the file from
  outside.

### Removed

- The **New Jiscribe Canvas** command.

### Fixed

- Nineteen fixes, among them a shape that could vanish after a reload, a
  `record` losing a compartment's text, exported text overflowing its width,
  and the camera moving on undo. The extension's
  [changelog](apps/vscode-extension/CHANGELOG.md#090---2026-09-03) has the full
  list.

## [0.8.0] - 2026-08-16

The first release in this repository.

### Added

- **Styled runs of text.** Any stretch of a shape's text can be bold, italic,
  underlined, struck through, coloured or resized on its own, and it is edited
  on a surface that draws what it will look like.
- **A frameless `text` shape.**
- **UML Package and UML Component**, bringing the shape set to 50 drawable
  types across seven shipped plugins (flowchart, UML, container, general,
  annotation, sticky, markdown).
- **Panning with the middle or right button carries momentum.**
- `.jis` / `.jiscribe` files open from the OS shell.

### Changed

- **The engine is MIT licensed.** It shipped under a custom EULA before.

### Fixed

- Thirteen fixes, among them a `record` whose text was shared with every other
  `record`, labels measured at one size and drawn at another, and geometry
  written to file as `83.43334999999999`. The extension's
  [changelog](apps/vscode-extension/CHANGELOG.md#080---2026-08-16) has the full
  list.

Earlier versions were released before this repository was public and are not
recorded here.

[Unreleased]: https://github.com/gznnk/jiscribe/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/gznnk/jiscribe/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/gznnk/jiscribe/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gznnk/jiscribe/releases/tag/v0.8.0
