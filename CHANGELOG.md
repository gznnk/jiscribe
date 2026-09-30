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

### Added

- **A command carries its own wording, in every locale it ships.**
  `Command.label` takes `string | LocaleMessages<string>`, exactly as
  `Stencil.label` already did, and a host override by id still outranks it. The
  built-in commands' Japanese moves out of the `ja` dictionary onto the commands
  themselves, leaving `CanvasMessages.commandLabels` as the host-override slot
  `stencilLabels` has been for a while — so a label and its translations are one
  declaration instead of two places that had to be kept in step. Resolution is
  per declaration (exact → language subtag → `en`), so a command shipping no
  `ja` falls back to its own English rather than dragging the canvas back with
  it. This is what makes a contributed command nameable in the host's language:
  a plugin declares the same field, and what it draws itself it localizes as the
  other shipped plugins do (`useCanvasLocale` + `resolveLocaleMessages` over its
  own dictionary).
- **For plugin authors: a plugin may contribute commands.**
  `CanvasPlugin.commands` is registered after `ALL_COMMANDS` in declaration
  order, and the host's own `config.commands` narrowing is applied over the
  result, so one list still narrows the whole set. The types a command is
  written against (`Command`, and the `CanvasControllerState` /
  `ICanvasRegistries` it reads) are exported from the unstable surface, which
  `canvas-sdk` re-exports whole: a command is a state transition over the
  canvas's working state rather than a settled contract, so it is not on the
  stable surface. Two commands may now share a keyboard shortcut as long as
  their `canExecute` disagree — the lookup answers with every match in
  registration order and the caller takes the first that can run, instead of
  taking the first match alone and passing the key to the browser when that one
  refused. No pair of built-in commands shares a binding today, so nothing
  shipped changes; a swept test holds that (`initializeCommands.exclusivity`).
  `CommandRegistry.register` now throws on a duplicate id rather than silently
  letting the later one win.
- **A table cell's background can be set from the floating menu or the property
  sidebar.** Cell Color paints the picked cells, or every cell when none is
  picked, and shows the colours split when they disagree. **No fill** takes a
  cell back to letting what is behind the table show through, which is not the
  same document as a cell filled with `transparent`. Both surfaces read and write
  the same cells, so the swatch states the value of exactly what it would change.
  For plugin authors: an `extraStyleProperties` descriptor may name a
  `textSlotField`, which stores the property on the selected slots rather than on
  the object; a `custom` item declaring `slotAware` survives the narrowing that
  happens while a slot is picked — on the property sidebar as well as the
  floating menu, where such a row now receives the resolved
  `objectPartSelection`; and `createDefaultPropertyPanel` /
  `appendPropertyPanelItems` / `PROPERTY_PANEL_SECTIONS` let a type add a row to
  the built-in panel instead of restating it.
- **A table's rows and columns can be added by the `+` beside the grid.** A round
  `+` stands at every boundary a track can go at — every rule and both outer
  edges of each axis — and clicking one inserts an empty track there. The cells
  keep their contents as the grid renumbers around it, the inserted track is left
  selected so a second insertion or a Delete needs no further aiming, and one
  undo takes the insertion back.
- For plugin authors: a selection control's click may now change the document.
  A handler answering a `click` or a `doubleClick` with an `object` is committed
  by the same step that closes out a drag, so the edit is materialized, recorded
  in history and saved. A click that changes nothing still records nothing.
- **A table's rows and columns can be selected, added and removed.** A grip
  outside the top and left edges picks a whole column or row; clicking a cell
  picks it, and Shift widens the pick to the block of cells between the two —
  the rectangle they stand at opposite corners of, as a spreadsheet does it, not
  the run of the cell order between them. Delete clears the picked cells' text,
  or removes the picked row or column — never the last one left. Rows and columns
  are inserted from the right-click menu or with Shift+Alt+arrow, and the cells
  keep their contents as the grid renumbers around the insertion. The six grid
  commands are named in English and Japanese, as the Cell Color button is.
- For plugin authors: a type declares what parts of itself can be selected
  (`ObjectTypeDefinition.parts`), and core carries one selection below the object
  level for every type — a range of them, not one. A `text: "slots"` type gets its
  slots as parts without declaring anything, and declaring them itself replaces
  that default, which is how a type says what Delete does to them and what a
  Shift-extended range between two of them covers (`ObjectPartDefinition.range`,
  omitted by every kind whose parts lie in one line). A selection control can now
  take a click and answer with a selection rather than only with its own object,
  and a type may add rows to the context menu
  (`ObjectTypeDefinition.contextMenu`).
- **A table can be resized by its left and right edges**, the width change spread
  over every column in the proportions it holds. A column never goes under its
  minimum, and a table dragged narrower than its columns can be simply stops.
  There are no handles on the height: a row's stored height is a lower bound its
  text raises, so the height follows the cells and a row is given one by dragging
  its boundary.
- **A table's column and row boundaries can be dragged.** Grabbing the rule
  between two columns gives one of them the width the other loses, so the table's
  own edges stay where they are however far the boundary is pushed — past a
  column's minimum it simply stops. Rows trade the same way, with one asymmetry a
  row's stored height forces: that height is a lower bound the text raises, so
  dragging a boundary up stops at the text of the row above it, while dragging it
  down past the text of the row below grows the table rather than clipping that
  text.
- For plugin authors: a `geometry: "point"` type declares the box its document
  does not store as `ObjectDocDefinition.pointSize`, and the doc-side ops measure
  it by that instead of by the rule the `text` shape happens to follow. It is the
  same measurement the type's factory places a new shape by, so placement and
  measurement cannot drift. A type registering one and declaring no size now
  fails its own parse-check suite (`@jiscribe/canvas-sdk/testing`) and is reported
  by `diagnoseDoc`, rather than quietly having no box at all.
- **A `table` shape: a grid of cells.** Each cell is a text slot of its own, so
  it takes the same rich text, the same typography and the same in-place editing
  every other shape's text does, and carries a `fill` besides. A table stores no
  size: its width is the column widths summed, its height the resolved row
  heights summed, and a row's `height` is a lower bound the text raises rather
  than a box the text is clipped to. Cells are written as a dense grid — one row
  per entry of `rows`, one cell per entry of `columns` — and a cell carrying
  nothing but text may be written as that text alone.
- For plugin authors: a shape may now declare `geometry: "point"` and let
  `createFrameMapper` map it — the doc stores the position alone and the box is
  re-derived from the content (`contentResizer`). `@jiscribe/geometry` gained
  `calcFrameCenterFromTopLeft`, the inverse of
  `calcFrameKeyPoint(frame, "topLeft")`, for the corner such a box is grown from
  and rebuilt around, and `@jiscribe/doc` exports `calcWrappedTextBlockSize` so a
  shape measuring its own text box does not restate the padding rule. A slot may
  carry fields of its type's own: every shared write copies a slot whole, which
  is now stated on `TextSlots` and held by a test.
- **For plugin authors, a breaking change:**
  `ObjectDocDefinition.textSlotStyleDefaults` is now
  `{ bySlot?, everySlot? }` rather than one map keyed by slot id. A type whose
  slot set is not fixed — a table's cells are one per row × column, so there is
  no list of ids — declares `everySlot`, which every slot without an entry of its
  own falls back to; a type that names its slots declares `bySlot` as before,
  wrapped in that field. The two are separate because one map keyed by slot id
  had to reserve an id for "every slot", which then could not be the name of a
  real slot in any document of the type.

### Changed

- **A shape placed from the toolbar or the shape library lands centered on the
  cursor, whatever its geometry.** `text` used to land with its top-left there
  instead: a shape whose size is measured rather than stored reported no size to
  offset a center by, so it was placed by the corner and, dragged out of the
  library, snapped to nothing. Both follow from the size now being measured at
  placement time. What a document holds is unchanged — a `text`'s `x` / `y` is
  still the top-left of the drawn box — and so is `add_object`, whose `x` / `y`
  still name that corner. **For plugin authors**, `createPointObjectFactory`
  takes the measurement as its second argument, `calcDimensions` answers with the
  real half-size, `createDoc` reads its `position` as the center for every
  geometry, and `calcPointDocDrawnTopLeft` / `calcPointDocCenter` read that
  conversion off a document's own transform fields.

### Fixed

- **A group's frame no longer goes stale when a shape inside it is edited by a
  command or a control.** Whether a group kept its box depended on _how_ an edit
  was made rather than on what it did — removing a table's row with the Delete
  key settled the group, the same removal from the right-click menu did not — so
  the group's outline, its handles and the width and height it reports could be
  left at the size it used to be. It heals on reload either way; what it cost in
  the meantime was typing a size into a stale group, which scaled its children by
  the wrong ratio.
- **Styling a table row or column picked by its grip lands on that row or
  column.** It used to be written to every cell of the table, because a picked
  track could not say which cells it stood for — and the swatch it was read back
  from showed the first cell alone, so the two did not even agree. For plugin
  authors: `ObjectPartDefinition.textSlotIds` is how a kind that stands for a
  group of slots names them, and a kind declaring none keeps landing on the whole
  object as before.
- **The reported box of a rotated shape whose size is measured no longer misses
  it.** `get_object_bounds`, and with it alignment, distribution and overlap
  checks, read a `text`'s stored coordinate as the box's plain top-left corner —
  but for a shape storing no size that coordinate is the corner as it is _drawn_,
  turned with the shape. A rotated or flipped text therefore reported a box
  beside the one it occupies, a quarter turn putting it a whole box away. An
  upright one is unchanged, as is the rule that these ops work on the
  untransformed box.
- **Resizing or moving a multi-selection inside a group no longer costs one pass
  over the whole drawing per selected object.** Settling the groups a transform
  invalidated copied the object map once for every selected id instead of once
  for the selection, and copied it through a spread that pays a proxy trap per
  object when the map is still the working copy a drag leaves behind. Both are
  now one copy of the map, whatever the selection holds. The bounds that come out
  are the same; what changes is the time the property sidebar's width and height
  fields take to answer a keystroke while several objects are selected.

## [0.11.0] - 2026-09-29

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
- **Shift keeps a polyline being drawn horizontal or vertical**, whichever way
  the drag has gone further from where it started. Other shapes draw as before.
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
- **The property sidebar's Canvas section sets the document's `view`**: the
  padding on each side, how the view is framed on open, and whether scrolling
  stops at the content.
- For plugin authors: `features.text: "source"`, for a shape whose body is
  source text it draws itself (as `markdown` now is). Such a body is a plain
  string, never runs, and carries no `fontWeight` / `fontStyle` /
  `textDecoration`; the canvas offers neither the emphasis controls nor
  Ctrl+B / I / U on it. `@jiscribe/doc` exports `TextType`, `textStyleKeysOf`,
  `isSingleBodyText` and `acceptsTextEmphasisStyle` to ask which styling a type
  takes, `OpaqueObjectDoc` for an object of a type the reader does not know,
  `ArrowTypes`, `ConnectPointIds`, `ConnectorRoutings` and `TextLayouts` for
  the values those properties take, and `isSemanticError` /
  `isSemanticWarning`. `@jiscribe/canvas-sdk` exports
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
  laid out by the shared typesetting it measures; it names the cards it left
  unchecked in one warning instead, so the silence is not read as a fit.
- **`jiscribe validate` checks with the canvas parser alone.** It no longer runs
  the JSON schema: the parser, the thing that opens the file, reports
  everything the schema did, so a finding is no longer reported twice in two
  spellings, and every `path` in `--json` output is the parser's
  (`root[3].width` rather than `/root/3/width`). An unknown property, an unknown
  enum value and an object of a type this build does not ship are now
  warnings, and a file carrying only warnings passes with exit code 0;
  `render` and `preview` draw such a file instead of refusing it. `text: []`
  is no longer refused (see above).
- **Undo, redo and reverting show what they changed.** When the change was
  off screen the view used to stay where it was, so nothing seemed to happen.
  The view now pans just far enough to show the objects the step changed, or
  where removed ones were, and centres on them when they do not fit. The zoom
  is never changed, the view never pans past where scrolling stops, and the
  camera is still not part of the history.
- **Pasting lands where you are looking.** A paste whose usual place, beside the
  original, is off screen goes to the middle of the view; pasting again while
  the copy is still selected steps on from it, as Duplicate does.
- **Stacking order and the aspect-ratio lock left the floating menu.** Both are
  in the property sidebar (the lock now also for a multi-selection and a
  group), and stacking order stays on the context menu and Ctrl/Cmd+`[` `]`.
- **An unlocked aspect ratio is no longer written.** Once a shape's lock had
  been turned off, every save wrote `"lockAspectRatio": false`, although false
  is the default; it is now left out, as an upright `rotation` and an unset
  flip already were.
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

- **A polyline's or polygon's vertex no longer snaps to its own outline.**
  Dragging a vertex (or one just inserted) pulled it onto the edges and centre
  of the shape's box as it was when the drag began. Other shapes now snap to a
  polyline's or polygon's vertices and centre instead of its box edges, and a
  vertex being dragged snaps to the other vertices of its own shape but not to
  its centre.
- **Styling text from the property sidebar keeps the text being edited.** A
  press on a sidebar control took the focus off an open text editor, so the
  caret and the highlighted stretch disappeared and what was typed next went
  nowhere. The sidebar now keeps the focus on the editor as the floating menu
  does, and hands it back once a typed field such as the font size is done.
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

[Unreleased]: https://github.com/gznnk/jiscribe/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/gznnk/jiscribe/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/gznnk/jiscribe/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/gznnk/jiscribe/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gznnk/jiscribe/releases/tag/v0.8.0
