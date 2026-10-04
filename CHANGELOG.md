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

- **For plugin authors: picking a vertex is a part selection too.** The separate
  single-vertex field is gone: a vertex handle now writes `selection.part` under
  the `vertex` kind, so the one channel carries every pick made one level
  below the object and the reducer's reconciliation covers vertices as it already
  covered slots — including a connector's waypoints, picked while the connector
  itself is the selection. Because two kinds now share the channel, every reader
  that narrows itself to text asks for the slot kind by name rather than for a
  pick of any sort. What the user sees changes where the vertex pick now follows
  the rules a slot pick already had: a style write or a sidebar edit of the size,
  position or rotation no longer drops the picked vertex (nothing renumbers it),
  so a Delete right after goes to that vertex rather than to the whole shape, and
  Escape drops the vertex first and the shape on the next press.
- **For plugin authors: picking a text slot is one case of a general part
  selection.** What was a slot-only field is now `selection.part`, a
  channel over the part kinds a type declares: the `kind` the ids belong to, and
  a list of ranges, each a fixed `anchorId` and a
  moving `focusId` — the model a DOM `Selection` keeps, so a later gesture can
  grow the active range or add another without the stored form changing again. A
  type that spells its text out as slots takes part with no declaration of its
  own: the `"textSlot"` kind is registered for it, its part ids being the keys of
  its own `text`. The reducer reconciles the channel after every action that
  rewrites the selection or the objects, through the kind's own `has`, so a
  selection the state no longer backs is already gone by the time anything reads
  it — the readers take `state.selection.part` as it stands, and each kind
  answers for its own ids. Nothing the user does changes: every range written
  today is a single slot.
- **For plugin authors: a type declares the sub-parts of its own objects.**
  `ObjectTypeDefinition.partKinds` takes one entry per part-id namespace (`kind`),
  each stating `has` — whether an id still names a part of that object — and
  `delete`. Core never learns what an id means: it carries the string around and
  hands it back to the type, so a kind it has no definition for simply has no
  parts. The first consumer is vertex deletion, which polyline, polygon and
  connector now go through: what the user sees is unchanged, including stopping
  at each type's vertex floor (two for an open line, three for a closed
  outline), which each type now states where it declares its part kinds instead
  of the delete command inferring it from the type id.
- For plugin authors: a type whose geometry does not settle its box declares it as
  `ObjectDocDefinition.bounds`, and the doc-side ops measure it by that declaration
  instead of by the rule the `text` shape happens to follow. Today that means every
  `geometry: "point"` type, whose document stores the corner it is drawn from and
  no size; hand the same measurement to the type's factory and where a new shape is
  placed cannot drift from where a saved one is measured, aligned and distributed. A
  point type declaring no box now fails its own parse-check suite
  (`@jiscribe/canvas-sdk/testing`) and is reported by `diagnoseDoc`, rather than
  quietly having no box at all.
- **For plugin authors: the parts a hand-written mapper is assembled from are on
  the unstable surface.** A `geometry: "point"` type is refused by
  `createFrameMapper` — its doc holds no box to convert — so it writes its own
  mapper and measures the box there, which until now meant rebuilding by hand
  what the shared mapper already knew. `ObjectMapper` and
  `mapTransformDocToState` / `mapTransformStateToDoc` (through
  `@jiscribe/canvas-sdk`) are the conversions such a mapper shares with every
  other type, and `collectStyleKeys` / `roundDocCoordinate` (through
  `@jiscribe/canvas-sdk/doc`) the two rules it must not restate: which fields
  belong to which style group, which the parser builds the names it accepts
  from, and the rounding a coordinate written back to a doc goes through.
  `calcPointDocCenter` and `numberOverride` come with them, being what such a
  type's `ObjectDocDefinition.bounds` turns the stored corner into a box with.
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
- For plugin authors: a shape may now declare `geometry: "point"` — the doc
  stores the position alone, and the box is measured from the content. Such a
  type writes its own mapper, measuring the box as it maps (`TextMapper` is the
  worked example), and declares a `contentResizer` for re-deriving it after an
  edit; `createFrameMapper` takes a rect or an ellipse only, and refuses a point
  type at compile time. `@jiscribe/geometry` gained
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

- **For plugin authors: the selection is one nested value, `selection: { objectIds,
part }`.** `CanvasControllerState` used to hold the object selection and the
  pick made one level below it as two fields that only made sense together, so a
  writer could move one and forget the other and only the reducer's safety net
  caught it. Nested, every writer states both in the same breath — and
  `reconcileObjectPartSelection` is back to being the net it was meant to be,
  dropping a part whose object is gone or whose ids have been renumbered.
  `objectIds` is read-only, and `part` is non-null only while exactly one object
  is selected, which is why `ObjectPartSelection` no longer names its own object:
  its owner is `selection.objectIds[0]`. `ObjectMenuItemProps` and
  `PropertyPanelItemProps` hand a row the whole `selection` in place of
  `selectedIds`, so a slot-aware row reads the pick from the same value it reads
  the ids from. Hosts are unaffected: `getSelection`, `select` and
  `onSelectionChange` still speak in plain id lists.
- **For plugin authors: a connector is selected through the one id list like
  everything else.** The separate single-connector field is gone, so
  `selection.objectIds` carries every selection the canvas holds; the rule it
  carried stays as the writers' own — a connector is selected on its own, one of
  them, never beside a shape — and a reader that needs it asks
  `getSelectedConnectorId` for that shape. `ObjectMenuItemProps` and
  `PropertyPanelItemProps` no longer pass `selectedConnectorId`: a row reads the
  connector off the `selection` and `objects` it already receives. For hosts
  nothing changes — `getSelection`, `select` and `onSelectionChange` have
  levelled the two into one list all along — except that `select`'s report drops
  the same field.
- **A right click selects the shape it lands on, and then opens the context
  menu.** The menu used to act on whatever was selected at the time, so a right
  click on another shape ran the command on the one still selected elsewhere —
  the shape under the cursor was not even what the menu described. Right-clicking
  a shape already in the selection keeps the whole selection, so a multi-selection
  can still be acted on from one of its members, and a right click on the
  background, a control handle or a menu changes nothing. The touch long press
  mirrors it, and the decision is the left click's own `determineSelection`, which
  is what makes a group member resolve to the group exactly as it does on a left
  click.
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

- **Delete on a connector's last waypoints does something again.** A connector's
  `points` holds only the waypoints between its endpoints, yet its vertex floor
  was the polyline's two, so with one or two waypoints left the key was claimed
  and refused: nothing moved, and the connector did not go either. The floor is
  now none, so a picked waypoint is always removed — down to the straight route
  the connector started as.
- **A shape whose size is measured no longer stays put when the group around it
  is resized.** Scaling a group scales the gaps inside it, and every shape that
  stores a box moved with them — but a `text`, whose box is its own content,
  carried no extent for the scale to write and so was left at the coordinate it
  started from. A label centred under an icon ended up beside it, by half of
  however much the icon grew. Its box is still the text's own; what follows the
  layout now is where that box sits, its centre landing where any other
  geometry's would. A `text` named in a resize of its own is still refused —
  that is a caller stating a size, which this geometry has no field for, while a
  group scale states the layout instead.

- **`resize_object` no longer reports success on a shape whose size it cannot
  set.** A `geometry: "point"` shape — a `text` — is measured from its own
  content every time it is read, so there is no extent for a resize to write;
  the op planned the change, found no case for the geometry and wrote nothing,
  answering as though it had. It now refuses the id and says what to change
  instead: the fields the content is laid out in, a block text's own width among
  them. `resize_objects` rejects the whole batch the way it already does for a
  connector, naming the offender as `ids[i] (id)` and leaving every other id
  untouched, so a selection holding a text resizes nothing until that id is left
  out. Reporting the box, aligning and distributing by it, and moving the shape
  are unchanged — only setting the box is refused.
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
