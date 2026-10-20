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

- **DOMPurify is now 3.4.16.** The advisories fixed there concern `IN_PLACE`
  sanitizing and `afterSanitize` hooks, neither of which `@jiscribe/canvas` or
  `@jiscribe/markdown` uses, so no drawing was exposed; the bump keeps the
  shipped version off the advisory list.

### Added

- **`table_set_text_style` decorates part of a cell's text** — a word in bold,
  a term in another color — the way `set_text_style` does for one object's
  text. It names the stretch by its characters (`match`, with `occurrence`
  counted within each cell) and works over a range of cells, leaving those
  that do not hold the stretch as they are; it fails only when no cell of the
  range is decorated. `table_set_cell_style` still styles whole cells.
- **`styleRichTextMatches` in `@jiscribe/doc`** finds a stretch of a rich text
  by its characters and styles every occurrence or one of them, reporting an
  empty match, a stretch not found or an occurrence past the last as a result
  rather than an error. It is what `setInlineTextStyle` runs on.
  `clearInlineStyleFromRuns`, which `setStyle` drops a whole-text property
  from the styled stretches with, is exported beside it.
- **`textMatchSchema` and `inlineTextStyleSchema` in
  `@jiscribe/canvas-sdk/tools`** (from `@jiscribe/ai-tools-sdk`): the
  `match` / `occurrence` arguments and the inline typography `set_text_style`
  declares, for a plugin tool decorating part of a text of its own.

### Changed

- **`table_set_cell_style` overrides what part of a cell's text set for the
  same property.** A cell typed bold in part and then set to `fontWeight:
"normal"` stayed bold in that part; it now drops the property from the
  stretches, as `set_style` does on a shape's text and as styling a cell on
  the canvas already did.

### Fixed

- **Dragging a table out of the shape library shows its ghost on an empty
  canvas.** In Chromium the ghost stayed in the DOM but was never drawn while
  nothing on the canvas gave it a snap guide.
- **The table tools no longer tell an AI to write a cell through `set_text`.**
  Their descriptions named a cell's text slot as something `set_text` and
  `set_text_style` take, but both refuse a table; cell texts are written with
  `table_fill_cells` and styled with `table_set_cell_style`.

## [0.12.0] - 2026-10-19

### Security

- **A long `markdown` card no longer stalls the page.** `@jiscribe/markdown`
  renders with markdown-it's `linkify` on, and markdown-it 15.0.0 spent
  quadratic time there, so a few hundred KB of text could block the event loop
  for tens of seconds. It is now on 15.0.2.

### Added

- **A `table` shape: a grid of cells.** Each cell is a text slot of its own,
  with the same rich text, typography and in-place editing as any other shape's
  text, and may carry a `fill` over the table's background. The table stores no
  box: its width is the column widths summed and its height the row heights,
  each row growing to fit its text. Rows and columns are picked, inserted and
  deleted from lettered and numbered headings, as in a spreadsheet; cells are
  picked by clicking, Shift-clicking a block, Ctrl/Cmd-clicking, or with the
  arrows and Shift+arrows, and the corner where the headings meet selects every
  cell. Column and row boundaries, the right and bottom edges and the
  transform frame resize it.
- **An `erEntity` shape for ER diagrams (IE notation), in a new "ER" stencil
  category.** An entity is a title band over its columns, each a `key`, a
  `name` and a `type` drawn in lanes of their own. Its width is the three lanes
  summed and its height follows the columns, as a table's does. Columns are
  picked, inserted and deleted, and the lanes picked and resized, as a table's
  rows and columns are, and each column offers the connect points `col:<index>:left` /
  `col:<index>:right`, so a relationship line runs from a foreign key to the
  primary key it references and follows its column when columns are inserted
  or deleted. The key, name and type slots hold one line; `diagnoseDoc` reports
  a line break in one as an error. The drawing guide covers it.
- **AI tools for tables, ER entities and UML records.** `table_*` (seven
  tools) read a table and edit its tracks, cells and their styles;
  `er_entity_*` (six) read an entity and edit its columns, texts and their
  styles, carrying the attached connectors along; `record_set_compartments` sets
  a record's stereotype band and compartments and fits its height to them. The
  text tools and `set_style` point to these when they cannot reach a type's
  texts, and `list_types` lists them under `tools`.
- **A UML record's compartments are picked as a table's cells are**:
  Shift-click picks a run, Ctrl/Cmd-click adds or removes one, ↑ / ↓ move the
  pick and Shift+↑ / Shift+↓ widen it. A style change lands on every picked
  compartment.
- **Tab moves an open text edit on to the next cell or compartment**, committing
  the one left, and Shift+Tab goes back; from a table's last cell it appends a
  row, and from an entity's last slot a column. **Ctrl+Enter (Cmd+Enter)
  commits an open text edit and closes the editor** (the `commitTextEdit`
  command).
- **Bold, italic, underline and strikethrough work the same from the keys and
  the buttons.** Ctrl/Cmd+B / I / U / Shift+X act on selected shapes without
  opening the editor, and on the whole text being edited when nothing is
  highlighted. A mixed selection turns all on first, in one undo step.
  Underline and strikethrough toggle independently of each other.
  Ctrl/Cmd+Shift+B / I / U no longer toggle anything, and on a Mac the keys
  take Cmd alone. For hosts they are the commands `toggleBold` /
  `toggleItalic` / `toggleUnderline` / `toggleStrikethrough`.
- **A connector end can attach to a connect point a type declares**, such as an
  `erEntity`'s `col:<index>:left`, through `connect` / `connect_many` /
  `update_connector` / `update_connectors`. An id the object does not offer is
  refused with the ones it does, where it used to be drawn at the center, and
  `diagnoseDoc` warns about an end a document already holds on such an id.
- **`diagnoseDoc` reports a record too short for its rows**, which it used to
  call clean while the bottom rows were drawn past the box.
- **For plugin authors: a type declares the sub-parts of its objects.**
  `ObjectTypeDefinition.partKinds` takes one `ObjectPartKindDefinition` per
  part-id namespace, stating `has` and `delete` (the changed object, plus an
  optional `connectPointRemap` that core applies to the connectors attached to
  it), and optionally `multiPick`,
  `region` / `regions` (a part's box, outlined when picked), `list` (Tab order),
  `range` (what a Shift-click range covers), `textSlotIds` and
  `styleIntentKinds` (what a pick is styled through), and `extend` (what Tab
  past the last slot appends). A pick is stored in `selection.part` as a kind
  and a list of anchor/focus ranges. Core registers `"textSlot"` for every
  type holding text and `vertex` for polylines, polygons and connectors.
  `createTextSlotPartKindDefinition`, `TEXT_SLOT_PART_KIND`,
  `resolveTextSlotIds`, `TEXT_STYLE_INTENT_KINDS`, `collectObjectPartIds`,
  `readActivePartFocusId` and `remapConnectorEnds` (the same remap,
  for a plugin command) are on `@jiscribe/canvas/unstable`.
- **For plugin authors: a plugin may contribute commands** through
  `CanvasPlugin.commands`, narrowed by the host's `config.commands` like the
  built-ins. A command's `label` takes `LocaleMessages` as a stencil's does.
  Commands may share a shortcut when their `canExecute` disagree, contributed
  ones being asked first. A command reports a document edit by returning its
  state through `commitEdit`, and `CommandRegistry.register` throws on a
  duplicate id. `Command` and the state types it is written against are on the
  unstable surface.
- **For plugin authors: selection controls take clicks and layers.** A
  definition lists the gestures it wants in `events` (`"click"`,
  `"doubleClick"`, `"drag"`, `"dragEnd"`), its `handle` may set the part
  selection (see Changed), its context carries the `selectedPart` standing on
  its object, and `layer` (`"belowHandles"` / `"aboveHandles"`) says whether it
  sits under or over the core handles.
- **For plugin authors: menus and sidebars.** A custom ObjectMenu item or
  sidebar row naming a part kind in `pickedPartKinds` stays up while that part
  is picked. `PropertyCommandButton` / `PropertyCommandGrid`,
  `resolveCommandLabel`, `getPlatformShortcuts`, `formatShortcut` and
  `createDefaultPropertyPanel` are on `@jiscribe/canvas/unstable`.
- **For plugin authors: connection anchors and connect points.**
  `connectionAnchors` gives each fixed anchor an `offset` (how far its dot sits
  off the edge) and a `hidden` flag (not offered for new connections; existing
  ones still draw). `ObjectDocDefinition.extraConnectPointIds` states the
  connect point ids a doc offers beyond the built-in four, and
  `listConnectPointIds` (`@jiscribe/doc`) is the list an end is held to.
  `ConnectorState` / `isConnectorState` and the endpoint types
  (`EndpointRef`, `OwnedEndpointRef`, `AnchorSpec`, `isOwnedEndpointRef`) are
  exported, so an edit renumbering a type's connect points can move the
  attached ends with it.
- **For plugin authors: content-sized shapes.** A shape may declare
  `geometry: "point"` (the doc stores the position, the box is measured from
  the content) and states that box as `ObjectDocDefinition.bounds`; a point
  type without one fails its parse-check suite. The mapper parts it is written
  from are exported (`ObjectMapper`, `mapTransformDocToState` /
  `mapTransformStateToDoc`, `collectStyleKeys`, `roundDocCoordinate`,
  `calcPointDocCenter`, `numberOverride`), with `calcFrameCenterFromTopLeft` in
  `@jiscribe/geometry` and `calcWrappedTextBlockSize` in `@jiscribe/doc`.
  A `contentResizer` is told which axes a handle drag writes and which edge it
  holds (`context.resizedAxes`), so such a shape can offer resize handles.
- **For plugin authors: text slots.** `textSlotStyleDefaults.byTextSlot` may be
  a function of the slot id, and `everyTextSlot` covers a slot set that is not
  fixed (`readTextSlotStyleDefaults` in `@jiscribe/doc` resolves them).
  `textEditLineBreaks` keeps a slot to one line. `readTextMeasurementGeneration()`
  (`@jiscribe/doc/unstable`) moves when web fonts change how text measures, for
  a shape caching measurements.
- **For plugin authors: a plugin can offer AI tools for its own shapes.**
  `defineObjectAiTool` (`@jiscribe/canvas-sdk/tools`, from the new
  `@jiscribe/ai-tools-sdk`) declares a tool acting on the one object a call
  names by `id`, held to the type's `validateDoc` before it is written and
  taken back by undo. A plugin exports its tools from a `./tools` entry,
  `@jiscribe/standard-shapes/tools` gathers the shipped ones as
  `standardAiToolPlugins`, and a tool moving connect points declares them in
  `connectPointRemap`. `textSlotStyleSchema` and `canonicalizeFontWeight` are
  the typography vocabulary `set_style` speaks. zod is a peer dependency.
- For plugin authors: `ObjectDocDefinition.diagnoseOverflow` lets a type report
  content its box cannot hold, which `diagnoseDoc` reports as errors;
  `docOps.replaceObject` swaps an object for a new doc of the same id and type,
  refusing what the parser would not keep.

### Changed

- **`add_object` refuses typography a new object has no field for** rather than
  silently dropping it.
- **Moving the pick from the keyboard keeps it in view.** The view pans just
  far enough to show the cell, compartment or slot the arrows or Tab land on;
  the zoom is never changed.
- **Undo and redo no longer jump to the middle of a large shape still on
  screen.** The view stays put on each axis where part of the change is in
  view, and centres only on a change wholly off screen.
- **A picked part is shown by its own box.** With a text slot, a cell, a row or
  a column picked, the box is tinted and outlined in place of the shape's
  selection outline, and the object menu hangs under it. Editing a one-body
  shape's text outlines its text area the same way, and Escape steps out in
  three presses: the editor, the text, the shape.
- **The object menu offers Bold alone for text formatting.** The text-format
  dropdown is gone; italic, underline and strikethrough stay in the sidebar and
  on their keys. `CanvasMessages.menuTextFormat` is removed.
- **A shape's own selection controls are hidden while it is moved or resized**,
  as the connection anchors already were.
- **Moving or rotating a shape no longer redraws its text**: a 300-cell table
  drags about three times faster. An exported SVG is unchanged.
- **A right click selects the shape it lands on before opening the context
  menu**, keeping the selection when the shape is already in it.
- **A shape placed from the toolbar or the shape library lands centered on the
  cursor, whatever its geometry**, a `text` included. What a document holds is
  unchanged.
- **A double click on a multi-slot shape picks the slot it opens**, and one on
  a group child or a member of a multi-selection narrows the selection to that
  shape. The host's `select()` commits what is being typed before moving the
  selection.
- **An AWS frame no longer offers the text vertical-basis switch**, which only
  moved its title band into the middle of the frame.
- **`@jiscribe/ai-tools` builds its declarations through
  `createCanvasToolSet`.** `createCanvasToolDescriptors` is no longer exported;
  read `descriptors` off `createCanvasToolSet(capabilities, aiToolPlugins)` and
  pass the same set to `applyCanvasOp` as its new last argument.
- **For plugin authors, breaking changes to the canvas API:**
  - The selection is one nested value, `selection: { objectIds, part }`. The
    separate text-slot, vertex and connector fields are gone: a slot or vertex
    pick is `selection.part`, and a connector is an id in `objectIds`
    (`getSelectedConnectorId` reads it). `ObjectMenuItemProps` and
    `PropertyPanelItemProps` pass `selection` instead of `selectedIds` /
    `selectedConnectorId`. Hosts are unaffected.
  - `textEditState` carries only the draft; what is edited is the selection's
    `textSlot` part. `reconcileSelection` closes an editor whose slot is gone.
  - `ObjectTypeDefinition.textRegion` is replaced by the `"textSlot"` part
    kind's `region` / `regions` (`createFrameObjectDefinition({ textRegion })`
    still works). `ObjectTextRegionRegistry`,
    `CanvasRegistries.objectTextRegion` and the UML plugin's
    `calcRecordTextRegion` are gone; `calcTextRegion` / `calcTextSlotRegions`
    take the part kind.
  - `ObjectDocDefinition.textSlotStyleDefaults` is
    `{ byTextSlot?, everyTextSlot? }` rather than one map keyed by slot id.
  - `extraStyleProperties` is now `styleEntries`, a `StyleTable` composed over
    the derived entries: a kind declared there replaces the derived one, and an
    entry writing a field the doc cannot hold is refused at registration.
    `declaredFieldEntry` and the core entry helpers are on
    `@jiscribe/canvas/unstable`; `ExtraStylePropertyDescriptor` and
    `StyleValueType` are gone from `@jiscribe/doc`.
  - A row reads the selection's style through `useSelectionStyle(name)`
    (`single` / `mixed` / `none` over the whole selection) and writes it
    through `onStyleIntent(intent, commit)`; `toStyleIntent` turns a name and a
    string into an intent. `getFirstSelectedWithProp` /
    `getFirstSelectedWithStyleGroup` / `getFirstSelectedPropValue` /
    `getSelectedShapeStyle`, `ShapeStyleGroup`, `StylePropertyUpdater` and
    `onPropertyUpdate` are gone. A plugin row now stands for the whole
    selection rather than its first shape.
  - A picked part narrows the menu and the sidebar to the controls its kind's
    `styleIntentKinds` receive, rather than to the text controls alone.
  - A type holding `textVerticalBasis` declares it in
    `features.textVerticalBasis`; one that does not is told so on an AI write
    and has the field dropped on save.
  - `data-part` carries only a part address, `<kind>:<id>` (`textSlotPart(slotId)`
    for a slot), and what a press starts goes in `data-action`
    (`event.targetAction`). `commandPart` / `togglePart` / `setPart` /
    `sliderPart` are renamed `commandAction` / `toggleAction` / `setAction` /
    `sliderAction`, `SelectionControlProps.part` is `action` and
    `SelectionControlEvent.subPart` is `subAction`.
  - `SelectionControlDefinition.handle` returns `{ object?, selection? }`
    instead of the object itself.
  - `createFrameObject` leaves `transform` unset on the props it hands a
    `renderTextOverlay`, and `transform` is optional on
    `FrameTextOverlayProps`, `TextOverlay` and `TextOverlayFrame`.
  - `createPointObjectFactory` takes the measurement as its second argument,
    and `createDoc` reads its `position` as the center for every geometry.
  - Renamed: `ResolvedSelection` → `RequestedSelection`,
    `resolveSlotStyle` → `resolveTextSlotStyle`,
    `TextSlotMeasurement.slotId` / `FrameTextOverlayProps.slotId` →
    `textSlotId`, `TextEditable.editingSlotId` → `editingTextSlotId`.

### Fixed

- **Fitting the view or exporting an image no longer crops a line that runs
  outside the shapes it joins**, when an end sits on a type-declared connect
  point such as a group marker's `tip`.
- **The shape library's search now reaches every icon, not just the ones laid
  out**, so `lambda` or `bicycle` is found; for AWS a term also matches the
  service category. A category may declare `search`
  (`StencilCategorySearch`) to answer from its whole set.
- **A shape whose renderer throws no longer takes the canvas down.** It is drawn
  as nothing and named in a console warning, and every other object stays
  drawn, editable and saved.
- **A group's frame no longer goes stale when a shape inside it is edited by a
  selection control or a plugin's command**, which left typing a size into the
  group scaling its children by the wrong ratio.
- **A style row states what the selection carries, and a style write lands
  where the row said.** A disagreeing selection shows as mixed, and an unset
  value shows as the type draws it.
- **A `text` follows the layout when the group around it is resized**, rather
  than staying at the coordinate it started from.
- **`resize_object` no longer reports success on a `text` it cannot size.** A
  block text's wrap width is set and its corner kept; a height, or any size for
  a point text, is refused with what to change instead. `resize_objects`
  rejects a batch holding such an id.
- **The reported box of a rotated or flipped `text` no longer misses it**, in
  `get_object_bounds` and in alignment, distribution and overlap checks.
- **Resizing or moving a multi-selection inside a group** no longer copies the
  whole drawing once per selected object.
- **A shortcut pressed mid-drag no longer records an edit the canvas then
  throws away.** Document-editing commands are refused until the drag ends;
  the view commands still run.

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

[Unreleased]: https://github.com/gznnk/jiscribe/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/gznnk/jiscribe/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/gznnk/jiscribe/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/gznnk/jiscribe/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/gznnk/jiscribe/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gznnk/jiscribe/releases/tag/v0.8.0
