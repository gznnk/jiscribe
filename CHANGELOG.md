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

- **`routeConnectors`: redraw the connectors without moving a shape.** The
  doc-op (`DocOps.routeConnectors`, the ai-tools `route_connectors`) gives each
  connector between two shapes the sides and the right-angled route that go
  around every other shape, the caption hung below a `"label"` type and a
  container's title band, running flush along none of their edges, paying for
  running within its margin (`EDGE_ROUTE_MARGIN`) of them or of a container's
  frame (the nearer, the dearer) and crossing and running along the routes drawn
  before it as little as it can; the corners are written as `points` and
  `routing` is dropped. It runs once: a shape moved
  afterwards is not followed. Omitted ids redraw every connector; named shapes
  (a group or a container shape standing for its contents) redraw the
  connectors among them. A self loop, an end that is free, on a declared
  connect point, on a container shape or on a rotated or flipped shape, ends
  whose boxes overlap and a connector no way is found for are left as they are
  and reported by reason (`ConnectorRouteKeptReasons`). A connector leaving
  through its own end's caption is moved to just beneath that shape, as
  `layoutObjects` does. The routing itself is `routeEdgesAroundNodes`
  (`@jiscribe/layout`): edge by edge in the order given, an A* search over an
  orthogonal visibility graph run from the obstacles' corners, their margins and
  the ends' stubs, first close around the two ends and further out only when
  no route is found there. Then the routes running together are spread
  `GAP_LANE_SPACING` apart (less in a tight channel, and a pair that has no room
  to part at all is left as it stands) in an order that keeps them from crossing
  where they need not, which can bring a run within half that of a shape,
  caption or frame, but never nearer than it already was. A route's first and
  last segments are spread too, each end sliding along its side within the
  stretch a layered layout fans a side's ends over (`EDGE_ANCHOR_FAN_RANGE`), so
  the ends sharing a side stand up to `EDGE_END_SPACING` apart (closer on a side
  too short for that, before any run is drawn closer); an end that slides gets
  its `t` rewritten. A jog, however long, is then straightened out where one of
  the segments either side of it can move onto the other's line without coming
  within `GAP_LANE_SPACING` of a shape, frame or other run, unless already
  nearer, or crossing more lines. Last, a connector's label is moved
  (`position` and `offset`) to where it covers as little of any shape, and as few
  of the other labels and of the lines redrawn in the same call, as it can: an
  edge given a `label` box (`RoutableEdge.label`) comes back with `labelPosition`
  and `labelOffset` (`RoutedEdge`).
  The canvas's `DEFAULT_CONNECTOR_MARGIN` now reads `EDGE_ROUTE_MARGIN`, and
  `doRectsOverlap` (`@jiscribe/geometry`) tells whether two rects share area.

- **`features.text: "label"`: a body drawn as a caption sized from its own
  text.** A type whose drawing fills its box, or that places its label off the
  box itself, declares it. By default the caption is centred under the box, 4px
  below it, by `calcLabelTextRegion` / `calcLabelTextVisualBounds` /
  `calcLabelTextBoxSize` (`@jiscribe/doc`, with `LABEL_TEXT_GAP`), measured with
  the type's own text defaults, so a headless reader and the canvas place it
  alike. A type placing it elsewhere declares a `"textSlot"` part kind and
  `visualBounds` together on its UI definition (`createFrameObjectDefinition`'s
  `textRegion` and `visualBounds`), and the core registers them in place of its
  own. The doc declares no `textRegion`: `resolveDocDefinitions` and
  `applyObjectDefinition` refuse one on a `"label"` type, along with
  `textVerticalBasis` and a geometry other than `"rect"`, and
  `applyObjectDefinition` refuses a `"textSlot"` kind or `visualBounds` declared
  without the other, or a kind with no `region` / `regions`;
  `createFrameObjectDefinition` refuses a `textRegion` or `visualBounds` passed
  alone. Its doc takes the `"body"` typography less `verticalAlign`
  (`LabelTextStyleDoc`, `textStyleKeysOf("label")`); `LABEL_TEXT_STYLE_DEFAULTS`
  is the creation typography to spread into its defaults. The fifteen shapes
  whose label is sized from its own text and stands off their drawing are
  `"label"` types now: actor, server, package, envelope, queue, gear and lock
  (general), extract and cross (flowchart), brace, bracket and bracketWithStem
  (annotation), and awsIcon, azureIcon and gcpIcon.
- **`features.text: "innerLabel"`: a caption sized from its own text that the
  shape places on itself.** It is a `"label"` caption in every rule above —
  one body, no `verticalAlign` or `textVerticalBasis`, geometry `"rect"`, no
  doc `textRegion` — but has no default place and no `labelFill`: its UI
  definition always declares a `"textSlot"` part kind and `visualBounds`
  (`createFrameObjectDefinition`'s `textRegion` and `visualBounds`), and
  `applyObjectDefinition` and `createFrameObjectDefinition` refuse it with
  either missing. Its doc is `InnerLabelTextStyleDoc` (`@jiscribe/doc`), the
  form `LabelTextStyleDoc` now extends with `labelFill`. awsGroup, whose title
  sits inside the frame on its own fill, is the one shipped `"innerLabel"`
  type. `isCaptionText` (true for both) and `hasLabelFill` (`"label"` alone),
  from `@jiscribe/doc`, are the two questions the core asks of a text type.
- **`labelFill`: the background of a `"label"` caption.** The caption is drawn
  over a box painted in `labelFill`, which `set_style` / `add_objects`, the
  ObjectMenu and the properties sidebar (a `label-style` section, built-in item
  `labelBackgroundColor`) set; omitted or `"auto"` knocks out what lies behind
  in the page's color, with the fill of any frame it lies on painted over it
  (`labelBackdrop`, below), the way a connector's label does. The field is
  `LABEL_TEXT_KEYS` (`@jiscribe/doc`), held by a `"label"` type alone; on any
  other type, a connector included, `setStyle` reports it as not taken. A
  component written without `createFrameObject` draws the box itself with
  `LabelTextFill` (`@jiscribe/canvas/unstable`, and so `@jiscribe/canvas-sdk`),
  passing the shape's id as its required `ownerId`, under which an `"auto"`
  caption finds the frames it lies on.
- **`labelBackdrop`: a frame's fill under the `"auto"` labels lying on it.**
  `ObjectTypeDefinition` takes `labelBackdrop`, returning the regions a frame
  paints, bottom first (`ObjectLabelBackdropRegion`, from `@jiscribe/canvas`: a
  rect in the shape's local coordinates, a resolved color and an opacity); it is
  handed the body fill the core resolved (`fillColor` / `fillAlpha`, as
  `createFrameObject` draws it), and `createFrameObjectDefinition` passes it
  through. An `"auto"` caption background or connector label `fill` lying on such
  a frame is painted in the page's color and then in each region where it lies
  under the label's box, so the label blends into a filled container or awsGroup
  instead of standing out as a page-colored box. Only the frames drawn before the
  label count; where the frame or the label's shape is rotated or flipped, the
  box's center decides and the region then covers the whole box. It is worked
  out again whenever the drawing changes, except during a drag, which keeps the
  previous result until it ends (an export taken mid-drag is worked out all
  the same); an export of a subset counts only the frames in it. container and
  awsGroup declare one; a filled rectangle is no backdrop. A connector label
  being edited stays on the page's color.
- **`@jiscribe/geometry` exports `calcBoundingBoxIntersection` and
  `isPointInBoundingBox`.** The first is the part two bounding boxes share,
  `null` when they share no area (apart, or only touching along an edge or at a
  corner, or with a `NaN` edge); the second whether a point lies inside a box or
  on its edge, `false` for an inverted box or a `NaN` coordinate.
- **A type can measure the text body it draws itself.** `ObjectTypeDefinition`
  takes `textMeasurer` (`ObjectTextMeasurer`, returning an
  `ObjectTextMeasurement`), which `CanvasHandle.measure.textSlot` calls in place
  of the plain-text layout; core still adds the region and the overflow verdict.
  `measureTextOverlayContent` (`@jiscribe/canvas/unstable`, and so
  `@jiscribe/canvas-sdk`) lays content out in a `TextOverlayFrame` off screen and
  returns its size, the building block for one. The markdown card declares one,
  so `measure.textSlot` on it now measures the body as it is drawn — headings at
  their larger size, block margins, tables — and reports a card the rendering
  overflows as `isOverflowing: true` where the plain-text layout said it fit.
  The ai-tools `measure_text` result says so too ("laid out as HTML blocks (no
  line count)") and carries the numbers as `AiCanvasOpOutcome.textMeasurement`,
  for a host to judge; while the page's fonts are still loading it measures
  once more after `document.fonts.ready`, so a heading is not measured in its
  fallback face.
- **`diagnoseDoc` takes measurements of the bodies it cannot measure itself.**
  `diagnoseDoc(doc, { measuredSourceText })` (`@jiscribe/doc-tools`) judges a
  `"source"` body (the markdown card) from a `MeasuredSourceText` a browser
  took, reporting an overflow as an error on the object and leaving a measured
  body out of the "not checked" warning; `listSourceTextObjects(doc)` lists the
  objects such a caller has to measure, and `resolveContentBox` reports
  `isSourceText` on a `region`, so a tool can tell a plain-text lower bound
  from a verdict (`formatSourceTextMeasureNote` is the sentence that says so,
  shared by `jiscribe measure` and the MCP server). The MCP server's
  `diagnose_canvas` is the first caller (see its changelog).
- **`diagnoseDoc` reports three more things a reader cannot see as written**,
  and `jiscribe diagnose` with it. An `svg` that references an internal id an
  earlier `svg` also defines is a warning, all markup sharing one page. A Japanese line-start prohibition is
  now looked for in text nothing wraps too — a `text` in its label layout and a
  label drawn outside its shape — at the breaks the author typed. And a font
  stack naming no family the canvas ships (or none installed) is one
  document-wide warning, since text in it is measured by estimate.
- **`@jiscribe/doc-tools/file` exports `diagnoseImageSources`**, which checks
  the file each `image` `src` names against the `.jis` file's directory: a
  missing file, a `src` no host accepts or an extension no host serves is an
  error (the canvas draws a placeholder), and a link leading out of the
  directory is a warning (the MCP viewer refuses it, other hosts follow it).
  `jiscribe diagnose` runs it; `validate` does not. `isInsideRoot`, the
  containment test the MCP host already used, moves here with it.
- **Automatic layout for graphs.** `docOps.layoutObjects` (and the `layout_objects`
  AI tool over it) arranges objects as a layered graph the way a flowchart renderer
  does: the connectors between them decide the layers, each layer is ordered to
  reduce crossings, and every connector between two placed objects is re-anchored
  onto the facing sides (straight on the column it travels in where that crosses
  the side, at the midpoint when it is the side's only connector, fanned out
  along a side several of them share; one between neighbouring ranks whose sides
  are both shared runs on a single straight column where both sides have room for
  it) and given
  a right-angled route around the objects between them, on a lane of its own where
  it overlaps another route crossing the same gap sideways; two connectors joining
  the same pair run side by side, and the ends sharing a side sit in the order their
  lines are headed, opened to arrowhead width where they would touch; a labelled connector gets room for its label, which
  moves onto a stretch of the line that holds it clear of every corner and of the
  boxes it joins (beside the line when none does). A route leaves a box straight
  for at least a stub's length before it first bends, and a gap too narrow for the
  routes crossing it is widened. A group, and a shape whose type declares the new
  `ObjectDocDefinition.layoutContainer` hook (`container`, `awsGroup`), is a container:
  what lies inside it is laid out inside it, the container is resized around them,
  and the title band the hook answers for it (the container's own `headerHeight`)
  is kept clear below its top edge; a connector
  with an end on a container shape is redrawn between the facing sides afterwards;
  one holding nothing is placed as a box of its own. An end on a connect point the
  owner's type declares (an ER entity's column) stays where it is, with that
  connector's route left to the engine, as is a self loop's. A `"label"` shape's
  caption is laid out as part of it (`LayoutGraphNode.visualMargin`, which
  `calcLabelTextLayoutMargin` measures): its neighbours, the border of the
  container around it and the other routes keep clear of it, the boxes of a rank
  stay lined up on their centres, and a connector leaving or entering through it
  runs straight through it before it first bends, with no label put there. Such a
  connector is moved to just beneath the shape in the stacking order (within its
  own parent, beneath the group holding the shape), so the caption reads over it;
  `LayoutObjectsResult.restackedConnectorIds` lists them. The layout reads the
  connectors in the stacking order of the shapes they join (source, then target,
  then the connector itself; `sortEdgesByEndOrder`), so restacking leaves a second
  run nothing to change. A spacing below 0 or a
  direction outside `LayoutDirections` is refused before anything moves. Direction (`TB` /
  `LR` / `BT` / `RL`) and the two gaps are parameters; omitting ids lays out the
  whole canvas, and the top-left corner of the objects' boxes stays where it was (a
  caption may reach past it). The algorithm is dagre's,
  wrapped in the new headless `@jiscribe/layout` package.
- **Automatic layout from the canvas.** Two new commands, `layoutTopToBottom` and
  `layoutLeftToRight`, run the same layout from the context menu and from the
  properties sidebar (the Arrange section for a selection, the Canvas section with
  nothing selected). With a selection, the selected objects are arranged as one
  graph, and a selected container shape brings what lies inside it along; with
  nothing selected, each part of the drawing joined by lines is arranged in place
  and a part with no line is left alone. One run is one undo step, the restacking
  of the connectors under a caption included, and a second run that changes
  nothing records nothing. `@jiscribe/layout` now also exports the
  pure steps the doc op and the canvas share: `resolvePlacements` (which objects
  are nodes and which are containers), `splitLayoutGraph` (connected parts),
  `isRectInside`, `calcFacingSides` and `createTakenEnds`.
- **Redraw the lines only, from the canvas.** A new command, `routeConnectors`,
  runs the doc-op `routeConnectors` from the properties sidebar (a row of its own
  after auto layout, in the Canvas section with nothing selected and the Arrange
  section for a selection) and the context menu. What it redraws is what the
  op's `ids` means: every connector with nothing selected; a selected connector,
  or the connectors joining the shapes the selection stands for. Shapes do not
  move, hand-shaped routes and moved labels in scope are redrawn, one run is one
  undo step, and a run that changes nothing records nothing. A command, a
  plugin's included, may now declare `busyLabel`: a press from any entry paints
  a small indicator with that text at the top centre of the canvas before the
  run blocks the main thread, fading in after 300 ms so a quick run shows
  nothing, its ring turning through the block. The redraw declares one,
  "Redrawing lines…". The auto layout buttons' tooltip now also says they redraw
  the lines, and the Japanese label of the Arrange section is 「整列」 instead of
  「重ね順」.
- **A stencil bar floats over the canvas.** `<Canvas stencilBar>` draws a
  column of buttons over the viewport's left edge, centred top to bottom below
  the top-left pill and scrolling when the room there is shorter, over the
  canvas rather than shrinking it. It shows while the chrome is collapsed and
  hides while it is expanded, the shape library then holding the shapes. It pins
  presets (`presetIds`, default `DEFAULT_STENCIL_BAR_PRESET_IDS`, core's
  basic primitives) that click to draw and drag to place as the top bar's do,
  then an "Other shapes" button that opens a popover to the right of the bar,
  as tall as the room below the pill, listing every shape in the shape library,
  with the sidebar's search and sections.
  Choosing a shape, Escape, a press outside it and expanding the chrome close
  it. Its sections fold together with the sidebar's, so a fold there reaches
  `onSidebarsChange` too. `show: false` removes it. `@jiscribe/standard-shapes` exports
  `standardStencilBarPresetIds` for it.
- **The canvas chrome has two forms, collapsed and expanded.** Collapsed, the
  full-width top bar gives its row back to the canvas and splits into two pills
  floating over the canvas's top corners along the same sides, in the stencil
  bar's look; shortcut help is hidden (`?` still opens it); the stencil
  bar and the floating ObjectMenu show, and no sidebar does. Expanded, the
  full-width bar is back with whichever sidebars are open, and neither the
  stencil bar nor the ObjectMenu shows — with both sidebars closed too. The form
  is state of its own, not read off the sidebars, so closing both sidebars
  does not collapse it. The drawing stays put on screen as the canvas area's
  top edge moves. The new `ToolbarSection.collapsedAlign` (`"start"` / `"end"` /
  `"hidden"`, omitted = the section's `align`) overrides a section's pill;
  within a pill sections keep their array order, exactly one divider separates
  neighbours, and an empty pill is not drawn. A host listing its own sections
  sets `collapsedAlign: "hidden"` on those that only matter while editing (a
  settings menu, say).
- **One switch collapses and expands the chrome.** The `sidebarsToggle`
  toolbar item runs the new `toggleSidebars` command, the only way to
  collapse, and shows pressed while expanded. Expanding brings back the
  sidebars the user left open, or opens both when that was neither.
  `DEFAULT_TOOLBAR_SIDEBARS_SECTION` places it at the far right.
  `toggleStencilLibrary` / `togglePropertyPanel` and a sidebar's own close
  button move that sidebar alone within the expanded form; pressed while
  collapsed (a host keeping one in the pills), a sidebar toggle expands with
  its own sidebar alone open.
- **Each sidebar has its own toggle beside the switch.** The new
  `DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION` holds the shape library and
  properties toggles (each pressed while its own panel is shown), and
  `DEFAULT_TOOLBAR_SECTIONS` and `standardToolbarSections` place it just before
  the switch. It is hidden while the chrome is collapsed, where the switch
  alone expands it. A host
  composing the default sections itself adds it before
  `DEFAULT_TOOLBAR_SIDEBARS_SECTION` to match.

- **The chrome's form is saved and restored with the sidebars.**
  `CanvasSidebarsState` (the `onSidebarsChange` payload) carries `isExpanded`,
  and `CanvasInitialSidebars` (`initialConfig.sidebars`) takes it; omitted, the
  canvas mounts collapsed. A sidebar's `left` / `right` `isOpen` now means open
  within the expanded form, and is kept while collapsed. Restoring the
  expanded form does not move the camera.
- **A canvas declaring no shape library gets a default one.** With
  `stencilLibrary` omitted, the library sidebar shows one section, headed by
  the new `messages.stencilLibraryAllShapes` ("All shapes" / "すべての図形"),
  listing the first few dozen registered presets in registration order; the
  section's search reaches every registered preset, icon sets included. A host
  applying an icon set still declares its own sections to get them grouped. The library toggle and
  the switch work the same with or without a declared library.
- **A connector's label is placed as it is drawn.** `ConnectParams` (`connect` /
  `connectMany` in `@jiscribe/doc`) takes `labelPosition` and `labelOffset`,
  and so does a `jiscribe op <file> connect_many` entry, so placing the label
  no longer takes a second `update_connectors`. Either one without non-empty
  `label` text is refused.
- For plugin authors: `ObjectDocDefinition.autoHeightPaddingEm` (also taken by
  `createFrameObjectDoc`) sets the room a type's derived height leaves above
  and below its text, in multiples of the body's font size, where it was
  0.75em for every type. Omitted, it stays 0.75em.
  The canvas, the doc ops and `diagnoseDoc` all derive with it; documents do
  not carry it.
- **A shape library section can open its whole category.** The new
  `StencilCategory.browseGroups` (`StencilCategoryBrowseGroup[]`: `id`, `label`,
  `presetIds`) lists everything a category holds, in sections. A section
  declaring it shows **Show all ›** under its grid, in place of **Find more
  shapes**, in the sidebar and the Other shapes popover alike. It opens a view of
  that category alone: a back button, the search box, now matching that category
  only, and the groups as collapsible sections, the first one open. The groups
  are drawn a batch at a time as the list scrolls. Using a shape there
  works as anywhere in the library. The toolbar flyout ignores the field. Two
  groups sharing an `id`, or one group naming a preset twice, throw on
  resolution; unregistered ids are dropped, and a group left empty is not
  shown. `CanvasMessages` gains `stencilLibraryShowAll` and
  `stencilLibraryBack`. `awsStencilCategory` declares 25 groups, one per AWS
  category ordered for architecture diagrams, holding all 781 icons;
  `lucideIconStencilCategory` declares 42 groups, one per Lucide category
  ordered for diagrams, holding all 1767 icons; an icon in several categories
  is listed in each.
- **`TextOverlayFrame` takes `exportAs`.** `"html"` keeps the box's rendered
  HTML in the PNG export instead of converting it to `<text>`; the SVG export
  still writes plain `<text>`, since a viewer such as GitHub strips
  foreignObject. The default `"text"` is what every box did before. The
  markdown card passes `"html"`.
- **canvas-sdk carries a kit for icon sets shipped as generated data.**
  `createIconSetCatalog` (`@jiscribe/canvas-sdk/doc`) closes one set's name
  tables into its lookup: resolution through aliases, mechanical shorthands and
  spelling variants, suggestions, the library search, the "show all" sections
  and the `icon` validator. On the drawing side, `createIconSetObject`,
  `createIconSetStencils` and `createIconSetStencilCategory` build the shape's
  component, its presets and its stencil category from that lookup and the
  generated drawings. `IconSetArt` suffixes the ids a drawing defines per
  instance, so the same icon drawn twice never puts one id in the document
  twice. `@jiscribe/canvas-sdk/icon-set-generator` is the set-independent half
  of a generator: it converts an SVG on allow-lists and fails on anything not
  on them, and writes the catalog and the drawings as two modules.
- **Azure architecture diagrams: `@jiscribe/plugin-azure-shapes`.** The new
  `azureIcon` draws any of the 636 Microsoft Azure Architecture Icons (V24),
  and Microsoft Entra ID (`entra-id`, also `entra` / `aad`) from the Microsoft
  Entra architecture icons (Oct 2023), which the Azure package does not carry,
  all redistributed unmodified under Microsoft's icon terms (the plugin's
  `LICENSE-ICONS.md`). It is built the way `awsIcon` is — a labelled,
  connectable node whose label hangs under the box, with no stroke or fill — and
  `icon` takes a flat kebab-case name (`virtual-machine`, `azure-cosmos-db`), the
  short names diagrams use (`vm`, `aks`, `vnet`, `kv`) and the name with
  `azure-` / `microsoft-` dropped (`cosmos-db`). `azureStencilCategory` lays out
  a palette of 54 icons labelled with the products' official names, searches the
  whole set and browses it in 25 sections. `@jiscribe/standard-shapes` now
  carries twelve plugins: `standardPlugins`, `standardDocPlugins` and
  `standardStencilLibrarySections` include it, so every host — the editors, the
  VSCode extension, the MCP viewer, the CLI — draws Azure icons. There is no
  Azure frame shape; the container plugin's frames serve.
- **An arrowhead's size can be set apart from the line width.** Polyline and
  connector take `arrowScale` (0.2 to 4, omitted = 1, both ends alike), and each
  head is drawn `9 × strokeWidth × arrowScale` px with its outline kept at the
  stroke width down to 0.5 and thinning with the head below it; the line still
  stops at the scaled head's base. The property panel's Arrows section gains a
  size row in percent (20–400%), `set_style`, `connect_many` and
  `update_connectors` take it, and `docOps.connect` / `updateConnector` refuse a value outside the range
  before writing. `@jiscribe/doc` exports `ARROW_SCALE_MIN`, `ARROW_SCALE_MAX`,
  `DEFAULT_ARROW_SCALE` and `ARROW_OUTLINE_THINNING_SCALE`; `CanvasMessages` gains `propertyPanelRowArrowScale`
  and `menuArrowScale`.
- **Google Cloud architecture diagrams: `@jiscribe/plugin-gcp-shapes`.** The
  new `gcpIcon` draws the 45 Google Cloud product icons (May 2026): the 19 core
  products' own icons and the 26 category icons Google draws every other
  product with, redistributed unmodified with attribution (Google publishes
  them for diagrams and documentation with no license attached; the plugin's
  `LICENSE-ICONS.md`). It is built the way `awsIcon` is — a labelled,
  connectable node whose label hangs under the box, with no stroke or fill —
  and `icon` takes a flat kebab-case name (`compute-engine`, `cloud-run`,
  `networking`), the short names diagrams use (`gce`, `gcs`, `spanner`) and the
  name of any product on Google's icon overview, which resolves to its
  category's icon (`pubsub` → `data-analytics`, `vpc` → `networking`).
  `gcpStencilCategory` lays out a palette of 42 icons labelled with Google's
  official names, searches the whole set and browses it in 10 sections.
  `@jiscribe/standard-shapes` now carries thirteen plugins, so every host
  draws Google Cloud icons. There is no Google Cloud frame shape; the
  container plugin's frames serve.

### Changed

- **Adding a column to an `erEntity` picks the new column instead of opening
  its name.** Add Above, Add Below and Add at Bottom leave the editor closed,
  as a table's row insertion does, and Enter opens the new column's name. Tab
  off the last slot still adds a column and carries on editing.
- **The label below a pictogram, an icon or a flowchart marker is painted on
  the page's color, and on the frame it lies on.** The twelve `"label"` shapes hanging their label below the
  box draw a box in `labelFill` behind it, so a connector or a shape lying under
  it is hidden where the label is, in images exported too; inside a filled
  container or awsGroup the box takes the frame's fill. Set `labelFill` to
  `"transparent"` for the old look, or reorder the objects. The group markers
  create with `labelFill: "transparent"`, and look as they did; one saved
  before this release carries no `labelFill`, so its label is painted on the
  page's color (or its frame's fill) too. Set its `labelFill` to `"transparent"` for the old look.
- **The group markers (brace, bracket, bracketWithStem) are `"label"` types,
  and awsGroup an `"innerLabel"` one.** Their label is sized from its own text
  as before; they now take no `verticalAlign` (a `verticalAlign` in an existing
  document is dropped on open with a warning), and awsGroup's menu offers no
  vertical alignment. The group markers take `labelFill`; awsGroup's title,
  drawn on the frame's own fill, takes none, and neither its menu nor the
  properties sidebar offers the label's background.
- **Breaking: `ObjectDocTextRegionCalculator` answers a rectangle, never
  `null`.** A shape whose label is not laid out inside its box is a `"label"`
  or `"innerLabel"` type instead; one that places that label itself declares a `"textSlot"` part
  kind and `visualBounds` together on its UI definition. A `"body"` /
  `"source"` type has to declare one: `resolveDocDefinitions` refuses it
  otherwise (`calcFullBoxTextRegion` for the whole box). `supportsAutoHeight` reads `features` and `autoHeight` alone
  (`AutoHeightDeclaration` loses `textRegion`, and so does
  `createFrameDocValidator`'s third argument), so a `geometry: "rect"`,
  `text: "body"` type may leave `height` out unless it declares
  `autoHeight: false`.
- **A `verticalAlign` on a `"label"` or `"innerLabel"` shape is dropped on open.** It never
  moved the label, whose box is sized from its text; the parser's migration
  removes it with a warning, and the next save writes the object without it.
- **`calcLabelBoxSize` (`@jiscribe/canvas-sdk`) is for a `"label"` or
  `"innerLabel"` shape that places its caption itself** (the group markers,
  awsGroup). It measures through `calcLabelTextBoxSize` over
  `LABEL_TEXT_STYLE_DEFAULTS`, or over the type's own text defaults handed as
  its new third argument (as awsGroup does with its 14px bold).
  `BelowLabelHitArea` places its grab area with `calcLabelTextRegion` from the
  shape's `type`, which its `state` now has to carry; it serves a type on the
  core's placement under the box. `resolveLabelFill` resolves a caption's `labelFill` as well as a
  connector label's `fill`.
- **Breaking: a type declares its `outline` and `anchorRegion` on its doc
  definition.** Both move from `ObjectTypeDefinition` to `ObjectDocDefinition`
  (typed `ObjectDocOutlineCalculator` / `ObjectDocAnchorRegionCalculator`, new
  exports of `@jiscribe/doc`), which `ObjectTypeDefinition` inherits, so the
  headless layer can read where a shape's silhouette runs. A plugin passing
  `outline` / `anchorRegion` to `createFrameObjectDefinition` gets a type error:
  pass them to `createFrameObjectDoc` (`@jiscribe/canvas-sdk/doc`), which now
  takes both and carries them into the definition, and the UI definition picks
  them up from `doc`. The calculator reads only fields a doc and a state share
  under the same name, since the canvas calls it with the state and the doc
  layer with the doc. `ObjectOutlineCalculator` / `ObjectAnchorRegionCalculator`
  (`@jiscribe/canvas`) remain as aliases of the doc types, and their default
  type argument is now `Dimensions` rather than `ObjectState & Dimensions`.
  `centeredPolygonOutline`, `OUTLINE_CURVE_SEGMENTS` and
  `calcRoundedRectOutline` are exported from `@jiscribe/canvas-sdk/doc` as well
  as from `@jiscribe/canvas-sdk`. The shipped plugins' outline functions move
  into their headless `schema/` layer and keep their package-root exports.
- **Breaking: `TextSlotMeasurement.lineCount` is `number | null`.** A body laid
  out as HTML blocks (the markdown card, or any type declaring `textMeasurer`)
  has no line count and reports `null`; code that does arithmetic on it has to
  handle that.
- **`jiscribe measure` gives no verdict for a markdown card.** It still prints
  the plain-text lines, the text box and the content box, but in place of
  `fits` a note says those are only a lower bound on the rendered body, since
  the card lays it out as HTML, and names the MCP server's
  `measure_rendered_text` as what measures it as drawn. The JSON form carries
  `fits: null` beside the note, and the exit code is 0, as for a type that
  draws its label outside its box. `--height` is still required.
- **Breaking: `ObjectOverlap.covers` gains `"both"`, for two boxes with all four
  edges equal.** `CanvasHandle.measure.findOverlaps` used to report such a pair as
  `"first"`; it now reports `"both"`. Code that reads the containing shape as
  `covers === "first" ? ids[0] : ids[1]`, or switches over `covers` with a
  `never` default, has to handle the new value.
- **Breaking: `DocOps.resizeObjects` takes one entry per object.**
  `resizeObjects(doc, entries)` takes `ResizeObjectEntry[]` (an `id` with an
  optional `width` and `height`, exported from `@jiscribe/doc`) in place of
  `(doc, ids, params)`, so each object gets a size of its own, as
  `setPositions` gives each its own place. An id given twice is refused, and so
  is a group given together with an object inside it; an entry naming neither
  axis leaves its object as it is, and a refused entry is named
  `entries[i] (id)` with nothing resized. The `resize_objects` tool (and
  `jiscribe op <file> resize_objects`) takes the same `entries`, and its reply
  names each object with its new size.
- **Breaking: the AI tool set (`@jiscribe/ai-tools`, and so `jiscribe op` and
  `jiscribe tools`) keeps only the batch form of each edit,** taking one entry
  as well as many; see Removed for the tools that went. Each batch tool's
  description now states on its own every rule the single form's carried.

- **The ends sharing a side fan out over its middle 80%, up from 60%.**
  `EDGE_ANCHOR_FAN_RANGE` (`@jiscribe/layout`) is 0.1..0.9 of the side, was
  0.2..0.8, so `docOps.layoutObjects` and the canvas's auto layout commands
  spread several connectors leaving one side further apart, and
  `routeConnectors` lets their ends slide over that wider stretch: four ends on
  a side of a 64px icon stand 16px apart there, up from 12 (`EDGE_END_SPACING`
  is 20).
- **A line's drawn extent takes its arrowheads in.** Zoom-to-fit, the export
  viewBox, viewport culling, zoom-to-selection, the object menu's placement and
  `measure.visualBounds` (with the AI's `measure_visual_bounds`) now count each
  head as a square of its reach around the tip, so a large head is no longer
  cropped from an exported image. Exports and fits of a drawing whose lines end
  in heads come out slightly larger than before. The selection frame, hit test,
  snapping and group bounds still use the line alone.
- **A sticky or note whose height follows its text no longer leaves extra
  room above and below it.** Both hold top-left prose, where the 0.75em every
  other shape keeps opened the top alone while the text sat 6px off the left
  edge; they now declare `autoHeightPaddingEm: 0`, so the text sits about as
  far from the top and bottom as from the left. A document that leaves their
  `height` out draws them shorter.
- **The sticky note's properties sidebar offers its own pastel palette.** The
  Fill section's color row lays out the same ten swatches as the sticky's
  ObjectMenu, in the row itself, in place of the generic color dropdown.
- **The Icon and AWS sections of the shape library fill whole rows of six.**
  The Lucide icon category's presets add `bot`, `smartphone`, `send` and `x`
  (24 icons), and the AWS palette (tier 1) adds EBS `Volume` and `IAM Role`
  (102 icons). The rest of each set is still a search away.
- **`capture_canvas` keeps up to 2576 px on the long edge**, up from 1400 —
  what Claude Opus 4.7 and Sonnet 5 onward read without scaling it down. A part
  named by `ids`, `rect` or the selection is still drawn at full size (1 world
  unit to 1 px) and shrinks only past that edge; the tool's description now
  says so.
- **Migration: restored sidebars mount collapsed unless they say otherwise.**
  A host that passes `initialConfig.sidebars` saved before `isExpanded`
  existed, or builds one by hand, gets the collapsed chrome with those
  sidebars kept for the next expand; add `isExpanded: true` to mount expanded.
  Code building a `CanvasSidebarsState` itself has to add `isExpanded`.
- **The default top bar no longer carries the shape presets.**
  `DEFAULT_TOOLBAR_SECTIONS` is now history, view, help, the per-sidebar toggles
  and the sidebars switch; the presets moved to the stencil bar.
  `standardToolbarSections` changed the same way.
  `DEFAULT_TOOLBAR_TOOLS_SECTION`, `DEFAULT_TOOLBAR_PROPERTIES_SECTION` and
  `standardToolbarToolsSection` are still exported.
- **Migration: the stencil bar is shown unless you hide it.**
  `stencilBar.show` is independent of `toolbar.show`. A host that keeps
  presets on the top bar (composing `DEFAULT_TOOLBAR_TOOLS_SECTION` /
  `standardToolbarToolsSection`), or passes `toolbar={{ show: false }}`, must
  also pass `stencilBar={{ show: false }}`; otherwise each preset shows
  twice, or a canvas meant to have no bar keeps one.
- **Shortcut help has a section of its own.** `DEFAULT_TOOLBAR_VIEW_SECTION`
  is now zoom and zoom to fit; the help button moved to the new
  `DEFAULT_TOOLBAR_HELP_SECTION`, which `DEFAULT_TOOLBAR_SECTIONS` and
  `standardToolbarSections` place right after it, so the full-width bar looks
  as before. A host composing `DEFAULT_TOOLBAR_VIEW_SECTION` itself adds
  `DEFAULT_TOOLBAR_HELP_SECTION` after it, or loses the help button.
- **A divider no longer opens or closes the whole top bar, nor stands doubled
  between sections.** One left at the very start or end of the resolved bar is
  dropped, since it separates the bar from nothing; so is the leading divider
  of a section that follows one ending in a divider, unless the free space
  before the first end-aligned section lies between them.
- **Both sidebars are 280px wide with one content inset.** The shape library
  was 248px. Its preset grid now spreads six button-wide columns across the
  inset, so the last column lines up with the search box instead of leaving a
  wider margin on the right.
- **The e2e kit finds presets on either bar.** `selectors.toolButton` and
  `shapeItem` match the top bar or the stencil bar; `selectors.stencilBar`,
  `stencilBarOtherShapes`, the Other shapes popover's `otherShapesPopover`
  / `otherShapesPopoverSection` / `otherShapesPopoverItem` /
  `otherShapesPopoverSearch`, `sidebarsToggle` and `CanvasDriver.toggleSidebars()`
  are new. `mountPluginHarness` takes `stencilBarPresetIds` and shows no
  stencil bar without it. `selectors.toolbar` matches both pills while the bar
  is collapsed; `selectors.toolbarPill(edge)` scopes to one.
  `CanvasDriver.openPropertyPanel()` / `closePropertyPanel()` re-measure the
  canvas origin, which the full-width bar now moves; closing leaves the chrome
  expanded, and the new `CanvasDriver.collapseSidebars()` collapses it (which
  `CanvasDriver.arrange()` now does after its click); the new
  `CanvasDriver.openPropertyPanelWithContentShift()` also returns how content
  coordinates moved across the opening. `CanvasDriver.goto()` waits for the
  canvas area (the new `selectors.canvasArea`) rather than the Rectangle preset,
  which the stencil bar no longer shows while the chrome is expanded. The harness's
  `?defaultToolbar` switch gives the page the canvas default top bar;
  `?libraryOpen` mounts expanded; a page passing no `stencilLibrarySections`
  (or `?noStencilLibrary`) shows the canvas's default library, and the kit's
  library toggle with it; `?emptyStencilLibrary` declares an empty one.
- **The PNG export draws a markdown card's body as rendered.** Headings,
  lists, tables, code and KaTeX math come out as on the canvas rather than as
  plain text, in every PNG path (`exportCanvasToPng`, `rasterizeSvgToPng`,
  `export.capturePng`, `jiscribe render -o x.png`). The SVG export is
  unchanged: the body is still flattened to `<text>`. Not drawn: what KaTeX
  draws with pseudo-elements (parts of its stretchy
  constructs, `\tag` numbers). Rarely, a value that matches the browser's
  default for a bare element but not the one for its context (`ul ul`
  margins) reverts to the browser's. In Firefox, which has no Typed OM, every
  `auto` width and height is pinned to its size on the canvas, so the spacing
  between blocks can come out tighter. Should a browser taint the canvas over
  the HTML (WebKit is untested), the PNG falls back to the plain text it
  carried before, and a `console.warn` says how many cards were drawn so.
- **A PNG export of a drawing with a markdown card needs `img-src data:` in
  the host's CSP.** The rasterizer hands such an SVG to an `<img>` as a data
  URL rather than a `blob:` URL, which a foreignObject would taint the canvas
  through. A drawing without one still goes through a `blob:` URL. A page whose
  CSP allows `img-src blob:` alone fails to export a markdown card to PNG
  until `data:` is added.
- **Breaking: `@jiscribe/plugin-aws-shapes` keeps its icon names and its
  drawings in two modules.** `@jiscribe/plugin-aws-shapes/doc` loads the
  catalog alone (names, labels, categories, viewBoxes) and no drawing, so a
  headless host no longer reads the 2.4 MB of drawings. The per-function name
  API is folded into `awsIconCatalog` (`resolveName`, `isKnownName`,
  `readEntry`, `readLabel`, `suggestNames`, `search`, `listBrowseGroups`,
  `categories`, `validateIconName`), and the drawings are `AWS_ICON_DRAWINGS`.
  Gone: `AWS_ICON_ENTRIES` (now `AWS_ICON_CATALOG_ENTRIES`, without drawings),
  `AwsIconEntry` / `AwsIconNode` (now `AwsIconCatalogEntry` / canvas-sdk's
  `IconSetNode`), `resolveAwsIconName`, `isKnownAwsIconName`, `readAwsIcon`,
  `normalizeAwsIconName`, `suggestAwsIconNames`, `searchAwsIcons` with
  `AwsIconFilter` / `AwsIconSearchResult`, `AWS_ICON_CATEGORIES`,
  `validateAwsIconName`, `AwsIconArt`, `renderAwsIconNodes`,
  `calcAwsIconArtPlacement`, `readViewBoxSize`, `AwsIconArtPlacement`,
  `readAwsIconDrawing` and `createAwsStencilIcon`; their counterparts are the
  canvas-sdk icon-set kit's. Every name an `awsIcon`'s `icon` could hold
  resolves to the same icon as before, and the diagnostics read the same.
- **An icon's `icon` takes the product name as it is written under the icon.**
  `awsIcon`, `azureIcon` and `gcpIcon` resolve camel case, spaces, `&` and
  parentheses as the vendor writes them (`Amazon DynamoDB`, `Azure DevOps`,
  `BigQuery`, `Web & Mobile`, `Cloud Services (Classic)`), and a camel-case name
  split into words (`big-query`). `normalizeIconSetName` turns every character
  other than a letter, a digit or `/` into `-`, and `createIconSetCatalog`'s
  `resolveName` tries a last round with every `-` and `/` dropped, where a
  canonical name wins over an alias or a shorthand. `microsoft-entra-id` is an
  alias of `entra-id`. A library search for a term that normalizes to nothing
  (`&`, a term in Japanese) now matches nothing instead of laying out the palette.
- **Hit testing and snapping to a polygon outline are faster, with the same
  results.** `calcDistanceToSegment` (and so `isPointInPolygon`) takes a plain
  square root in place of `Math.hypot`, `calcOutlinePointTowardForPolygon`
  casts its ray in the shape's local space and transforms only the hit instead
  of the whole polygon, and `calcBoundingBox` derives a rotated frame's extents
  without turning its four corners.
- **Typing in a markdown card no longer renders its Markdown on every
  keystroke.** The card draws nothing over the editor, so it renders the body
  once, when editing closes.
- **Widening an ER entity no longer measures its texts on every frame.** A
  drag on a slot boundary or the right edge, and a resize of the box, lay the
  entity out from the texts as last measured; only the title band is wrapped
  again at the new width.
- **The AI tool descriptions are shorter.** `@jiscribe/ai-tools`, the style
  vocabularies of `@jiscribe/ai-tools-sdk` and the table, ER entity and record
  tools keep what a call depends on and drop reasons, examples and advice, so
  `jiscribe tools` prints shorter summaries and descriptions. `connect_many`
  points to `list_types` for the types an end attaches to instead of listing
  them; `AiCanvasCapabilities.connectableObjectTypes` is still filled in, but no
  tool wording reads it. `get_interaction_status` asks to hold off on edits
  while a text is open or a drag that changes the document is under way, and no
  longer calls an idle canvas safe to write to.
- **A caption sized from its own text is measured once per text, not per
  frame.** `calcLabelTextBoxSize` caches the size on the body it is given,
  matched on its text and resolved font, so moving, rotating or resizing a
  `features.text: "label"` shape, an annotation bracket or an AWS group measures
  nothing while the caption is unchanged.
- **An AWS, Azure or Google Cloud icon is not rebuilt while the shape around it
  is rotated, resized or has its label edited.** `IconSetArt` (canvas-sdk) is
  memoized on its `drawing`.
- **Searching the stencil library no longer re-ranks every icon on each
  keystroke.** The AWS, Azure and Google Cloud catalogs (`createIconSetCatalog`)
  and the Lucide set build a ranked search index on the first search and filter
  it after that; the results are unchanged.
- **A shape's outline is computed once per state, not per frame.** A connector
  redrawn while the shape at its other end stands still reuses that shape's
  outline, as do the connection anchors, hit testing and auto layout.

### Removed

- **Breaking: `calcOutsideBoxTextRegion` (`@jiscribe/doc`) and
  `BELOW_LABEL_STYLE_DEFAULTS` (`@jiscribe/canvas-sdk`) are gone.** A shape
  placing a label sized from its own text off the box declares
  `features.text: "label"`, spreads `LABEL_TEXT_STYLE_DEFAULTS`
  (`@jiscribe/doc`) into its defaults, and passes its UI definition a
  `textRegion` and `visualBounds` together.
- **Breaking: `calcBelowLabelTextRegion`, `calcBelowLabelVisualBounds` and
  `BELOW_LABEL_GAP` are gone from `@jiscribe/canvas-sdk`.** A shape hanging its
  text below the box declares `features.text: "label"` and passes neither a
  `textRegion` nor a `visualBounds`: the core places the caption
  (`calcLabelTextRegion`, `LABEL_TEXT_GAP` in `@jiscribe/doc`). Its doc
  definition drops `textRegion: calcOutsideBoxTextRegion` with it, and spreads
  `LABEL_TEXT_STYLE_DEFAULTS` (`@jiscribe/doc`) in place of
  `BELOW_LABEL_STYLE_DEFAULTS`.
- **Breaking: the single-object AI tools are gone.** `@jiscribe/ai-tools` no
  longer declares them, nor the op kinds behind them (`AiDocOp`'s
  `addObject`, `connect`, `setPosition`, `resizeObject`, `setPoints`,
  `setText`, `setTextStyle`, `updateConnector`, `dissolveGroup`), and
  `jiscribe op` refuses their names. Use instead:
  - `add_object` → `add_objects`
  - `connect` → `connect_many`
  - `set_position` → `set_positions`
  - `resize_object` → `resize_objects` (see Changed)
  - `set_points` → `set_points_many`
  - `set_text` → `set_texts`
  - `set_text_style` → `set_text_styles`
  - `update_connector` → `update_connectors`
  - `dissolve_group` → `dissolve_groups`

  `@jiscribe/ai-tools` no longer exports `AiInlineTextStyleParams`,
  `AiArrowType`, `AiRouting` and `AiTextLayout`, which only those op kinds
  used, and exports `AiResizeObjectEntry` for a `resize_objects` entry. The
  single ops themselves stay on `DocOps`.

- **Breaking: a placed AWS or Lucide icon no longer offers to change its
  icon.** The floating menu's icon picker and the properties sidebar's icon
  section are gone from `awsIcon` and `lucideIcon`; the icon is chosen by the
  shape library preset a shape is placed from, and a document edit (an AI's
  included) still changes it. Gone from `@jiscribe/plugin-aws-shapes`:
  `AwsIconPickerMenu`, `AwsIconGlyph`, `awsShapesMessagesByLocale` and
  `AWS_ICON_STYLE_ENTRIES`; `searchAwsIcons` takes `{ query }` alone, the
  `tier` and `category` fields of `AwsIconFilter` having gone with the picker's
  filter chips. Gone from `@jiscribe/plugin-lucide-icon-shape`:
  `IconPickerMenu`, `IconGlyph` and `ICON_STYLE_ENTRIES`. Neither type
  declares an `icon` style entry any more, so a host writing `icon` through the
  style system has nothing to write to.

- **Breaking: the floating menu no longer opens the properties sidebar.** The
  **…** button at its end is gone, and with it the `menuPropertyPanel` key of
  `CanvasMessages`, so a host whose messages object names that key gets a type
  error until it drops it. The menu shows only while the chrome is collapsed,
  and opening a sidebar from it switched the whole chrome to its expanded form. With
  the default bar the sidebars are opened by the switch for both; a host
  composing `DEFAULT_TOOLBAR_PROPERTIES_SECTION` keeps a properties toggle on the
  collapsed bar, and a canvas with no top bar has no way into the sidebars.
- **Breaking: `@jiscribe/ai-tools` no longer declares `to_svg`.** The `toSvg`
  op kind, `AiHandleControl.toSvgString` and `MAX_SVG_CHARS` go with it;
  `CanvasHandle.export.toSvgString` stays. `jiscribe op <file> to_svg` now
  reports an unknown tool rather than one only jiscribe-mcp runs.

### Fixed

- **Automatic layout keeps a connector's end on the drawn outline.** It chose
  where along a side an end sits as a share of the bounding box, so on a shape
  whose outline does not reach the whole side (a parallelogram's top and
  bottom) it could pick a spot past the slanted side, and the line started in
  mid-air beside the shape. `docOps.layoutObjects` and the canvas's layout
  commands now keep every end within the stretch of the side where an anchor's
  ray starts inside the outline and leaves it, from the type's `outline` and
  `anchorRegion`; a rotated or flipped shape is left out, being laid out by its
  box. Only an end that would fall outside that stretch moves (to its middle,
  or to the nearer part of the fan range), so an end already on the outline
  stays where it was. `LayoutGraphNode` (`@jiscribe/layout`) takes that stretch
  per side as `anchorRanges` (each a `LayoutAnchorRange`, now exported), and
  `TakenEnds.place` takes one for its side. The ends are
  also written as a share of the type's anchor region, which is how they are
  drawn: on the loop limit's and the off-page connector's left and right sides a
  line the layout ran straight used to meet the shape off level. Those two
  shapes' ends are centred and fanned out on the body the anchor region covers,
  rotated or flipped as well, as they were before: `LayoutGraphNode` takes that
  stretch per side as `anchorBodyRanges`, and `TakenEnds.place` takes one too.
- **A connector label with no `fill` masks the line in the document's
  `background`.** It drew in the theme's canvas colour, so on a document with its
  own opaque `background` every default label was a box of another colour, in the
  viewer and in PNG / SVG export alike. A default label now knocks the line out
  in the document's opaque `background`, and otherwise in the theme's canvas
  colour; its inline editor, the label-fill swatches and export follow it. On a
  frame declaring `labelBackdrop`, the frame's fill is painted over that colour.
- **A `set:` style action that changes nothing is no longer committed.** The
  ObjectMenu's and the properties sidebar's swatches wrote through it whether
  or not the value was already in place, and every write was a commit: a
  history entry holding the same document, the redo stack dropped, a save
  request raised. The shape colour pickers worked around it in 0.10.0 by
  skipping the swatch shown as picked where they could prove the pick idle;
  the font colour pickers could not, a text colour landing on the slots or on
  the run being edited rather than on the object. The proof now comes from
  the style entries themselves: `runOrTextSlotEntry` returns the object it was
  handed when every place the write would land is drawn with the value
  already — the slot, read through its type's defaults, with no run overriding
  the field, or every run the selected stretch covers, each read over the
  slot's — which is the same-reference contract the other entries kept, and
  `applyStyleAction` leaves `commitVersion` alone when `applyStyleIntent`
  answered with the same state. So a slot leaving the field to its defaults
  is no longer written for that default either, and a stretch inheriting the
  slot's value is not given a run of its own. A pick that reaches a type's
  own entry still commits where that entry rebuilds its object; the shipped
  entries do not.
- **Measuring text in Node no longer throws on some space and zero-width characters.** `@jiscribe/doc-tools`
  failed with `RangeError: Offset is outside the bounds of the DataView` on
  U+2009, U+200B and U+FEFF under Source Sans 3 and on U+2002 under Noto Sans
  JP, so the MCP server's `measure_text`, `add_objects` and `diagnose_canvas` and
  the CLI's `measure` / `diagnose` failed on any text holding one. fontkit cannot
  read these empty glyphs; their advance is now read from the font's `hmtx`.
- **The drawing guide no longer says `diamond` and `stadium` lay text out over
  the whole box.** They never did: a diamond uses its inscribed rectangle and a
  stadium the band between its caps, so text sized to the box wrapped. The guide
  and both shapes' schema descriptions now give the real region.
- **`docOps.setRotation` turns a text, table or ER entity about its centre.**
  These `geometry: "point"` types store the corner their rotation draws on
  top-left, and the op wrote the angle without moving that corner, so the shape
  swung about it: a text turned 90° by the MCP server's or the CLI's
  `set_rotation` landed well off where it stood. The corner is now rewritten
  for the centre to stay, as the op already promised; the box types, which
  store their box before the turn, were never affected.
- **Escape cancels an area selection while it is being dragged.** It did
  nothing until the button was released, since a drag refuses every command
  but the view ones. It now ends the marquee where it is: the rectangle goes,
  the selection returns to what the drag started from — nothing for a plain
  marquee, the selection being added to for an additive one — and the rest of
  the drag selects nothing. Shift+Escape cancels an additive marquee dragged
  with Shift held as well.
- **The chrome's icons are no longer blurred.** Some sat on half or
  fractional pixels: the stencil bar's whenever the room it is centred in
  differed from it by an odd height, the full-width top bar's, the shape
  library grid's (its columns spread across the panel) and the spin buttons of
  the properties sidebar's number fields. Each now lands on a whole pixel. The
  full-width bar is 1px taller, the grid's columns are packed from the left
  with a fixed gap, and the properties sidebar's label column is 1px wider.
- **Doc ops that take many ids no longer walk the document once per id.**
  `translateObjects` and the other ops taking an id list, `connectMany` and
  `updateConnectors` look every id up in one walk of the tree, so moving all
  5000 shapes of a document with as many connectors takes about 3ms instead of
  230ms, and re-attaching those connectors about 5ms instead of 1.3s. Results and
  error messages are unchanged.
- **Doc ops that create many objects no longer walk the document once per id.**
  `connectMany` and `addObjects` collect the document's ids once per call and
  hand out each new one from where the last of its type stopped, so drawing 5000
  connectors into a document of 5000 shapes takes about 4ms instead of 3.1s,
  and adding 5000 shapes to one about 40ms instead of 4.3s. The ids handed out
  and error messages are unchanged.

## [0.12.2] - 2026-10-25

### Security

- **The markup of an `svg` object can no longer restyle the page or make the
  browser fetch a URL.** It was sanitized with DOMPurify's defaults, which
  keep `<style>`, `<a>` and an `href` to any `http(s):` URL, and never look at
  `url()` in a presentation attribute or an inline `style`. An inline `<style>`
  applies to the whole page, so one shape in a shared `.jis` could hide or
  restyle the editor around it,
  and an `<image href="https://…">` or `filter="url(https://…)"` could have the
  reader's browser fetch a URL of the file author's choosing. `<style>` and
  `<a>` are now dropped, and every attribute holding an `href` / `xlink:href`
  that is not a `#fragment`, or a CSS function that loads something (`url()` to
  anything but a fragment, `image-set()` and the like), is removed whole, CSS
  escapes resolved first; a `data:` image on `<image>` stays. Dropping
  `<style>` takes its rules with it, so `class`-styled markup such as
  Illustrator's "internal CSS" export loses those styles; export with
  presentation attributes or inline `style` instead.
- **A `.jis.svg` can no longer stall the reader for minutes.** Locating the
  embedded `jiscribe:source` element took time quadratic in the file's size
  when it held open tags without close tags, so a crafted file of a few MB took
  minutes on the thread that opens it; the scan is now linear. A character
  reference past U+10FFFF inside it (`&#x110000;`) is kept as written instead
  of throwing out of the reader.
- **An object whose `id` is `__proto__` is rejected by the parser.** Hosts key
  plain objects by id, so such an object vanished from every scan while its id
  stayed in the tree, and the first edit after opening failed, leaving the
  document unsaveable. Any id that is a property name of `Object.prototype` is
  now a structural error.
- **A crafted link reference definition no longer stalls a `markdown` shape.**
  markdown-it is now 15.0.3 (GHSA-gfr2-rv44-r23c): a single multi-line link
  reference definition rendered in time quadratic in its length. The other
  advisory fixed in 15.0.3 (GHSA-vfgh-jcmw-g37q) needs `html` on, which the
  renderer never enables.

### Added

- **A document can carry a name and a description.** The `.jis` root takes
  `meta`, the same record an object carries (`name` / `description` /
  `reference`, open to a host's own keys), checked by the parser as an object's
  is. The properties sidebar's Canvas section edits the name and description,
  and an SVG export opens with them as `<title>` and `<desc>`. Headless,
  `docOps.setMeta` writes them — or, given an `id`, one object's — and
  `@jiscribe/ai-tools` declares it as `set_meta`; `describe_canvas` now lists
  the document's own fields ahead of `root`. `MetaDoc` is exported from
  `@jiscribe/doc`.
- **`capture_canvas` can take a picture of one part of the drawing**, named by
  `ids`, a world `rect` or `target: "selection"`, and with `isolate: true`
  draws only the objects named; `fit_view` takes the same `ids`. The result
  names the world rect the image covers and its pixel size. The region
  arguments are declared once for both tools (`AiRegionArgs` in
  `@jiscribe/ai-tools`), and the `CapturePng` a host injects now hands back the
  canvas's `CanvasPngCapture` rather than the bare blob.
- **An export can draw the named objects alone.** The export handle's
  `{ ids }` region takes `isolate: true` (`CanvasExportIdsRegion`), which draws
  only those objects, their descendants and the connectors whose attached ends
  are all on them — the set Copy takes — leaving out whatever else lies inside
  their extent. The embedded `.jis` source holds the same set, so dropping the
  image back on a canvas gives what pasting the objects would. Without
  `isolate` the region still crops. An `{ ids }` region none of whose ids draws
  anything makes `toSvgString` / `capturePng` reject instead of exporting the
  current view.
- **The Export dialog can export only the selected shapes.** A "Scope" row
  chooses between the whole drawing and the selection, which is exported on its
  own as above. The scope starts at the selection whenever something is
  selected, so exporting from a shape's context menu exports that shape.
- **The AWS icon and the Lucide icon can be changed from the property
  sidebar.** Both shapes now lead their sidebar with an Icon section opening
  the same picker as the object menu, beside the sidebar, or under the field
  where the canvas has no room for it. A selection drawing different icons
  shows the field as mixed.
- **The property sidebar can group, ungroup and open a reference.** The
  Arrange section ends with a Group button for a multi-selection and an Ungroup
  button for a selected group, offered under the same rule as the object
  menu's, and now also shows for a selection across different parents, with the
  stacking-order buttons disabled. The Meta section carries an "Open
  Reference" button for an object whose `meta.reference` is set, while the host
  passes `onOpenReference`.
- **The CLI edits documents: `jiscribe tools`, `jiscribe op` and `jiscribe
guide`.** They drive the same `@jiscribe/ai-tools` declarations jiscribe-mcp
  registers, so a tool's name, arguments and reply text are the ones an MCP
  client sees. `jiscribe tools` lists the tools a document alone can answer and
  prints one's argument JSON Schema. `jiscribe op <file> <tool> --args <json>`
  runs one; `jiscribe op <file> --batch <@path | ->` runs a JSON array of
  `{ tool, args?, as? }` in order, where a later entry refers to the ids an
  earlier one created as `"$name"` / `"$name.N"`. The file is written back once,
  only if something changed, and the first entry that fails leaves it as it
  was. The write goes through the same check jiscribe-mcp writes with, so an
  edit that adds findings the loaded file did not have, or a file changed on
  disk since it was read, fails the run with nothing written. `--create`
  starts a missing file, and `--text` reports in lines rather than JSON.
  `undo` is not offered. `jiscribe guide <drawing | json-format>`
  prints the guides `read_drawing_guide` hands back.
- **`@jiscribe/doc-tools` reads and writes canvas files, and carries the
  editing tool set and the guides.** `./file` is the file layer jiscribe-mcp
  used to keep to itself (`loadCanvasFile`, `saveCanvasFile`,
  `ensureCanvasFile` and the rest), `./canvas-tools` the tool set and doc-ops
  over the shipped shape set (`standardCanvasToolSet`, `standardDocOps`), and
  `./guides` the two drawing guides (`readDrawingGuide`); the root adds
  `formatDiagnostics`. `@jiscribe/ai-tools` exports `isCanvasHandleTool`,
  `toOutcomeText`, `toThrownText` and `toDrivesMismatchText`, how a host routes
  a declaration and words what a call came to.
- **A desktop app holds the MCP server (proof of concept).** `apps/desktop`
  (`jiscribe-desktop`, not published) runs first and stays up, serving the
  `jiscribe-mcp` tool set over Streamable HTTP on `127.0.0.1`, so AI clients
  connect to it by URL rather than starting a process each. Every client
  session shares one canvas host, one set of file locks and one undo history,
  and the viewer opens in the app's own window instead of a spawned browser.
  There is no installer or tray yet: closing the window hides it and starting
  the app again brings it back. Outside macOS there is no menu bar; Open… and
  Quit sit in the viewer's toolbar. A canvas is on display from the start —
  the one open at the last quit or Open…, or a scratch `untitled.jis` of the
  app's own — and quitting writes out a pending edit before closing.
- **`applyCanvasOp` reports the ids an op created.** `AiCanvasOpOutcome`
  carries `createdIds`, set by `addObject` / `addObjects` / `connect` /
  `connectMany` / `groupObjects` in the order the objects were created, and
  absent when an op created nothing. The result text is unchanged.
- **For plugin authors: `TextOverlayFrame` takes `maxFontSize`**, the largest
  size anything inside the box is drawn at, for content that draws parts of
  itself larger than `fontSize`. It decides when the box counts as too small to
  read (see Changed); omitted, `fontSize` does. The Markdown shape passes its
  largest heading.
- **For plugin authors: `PropertyDropdownField` takes `placement`.**
  `"under"` (the default) opens the panel under the trigger inside the sidebar,
  now never wider than the sidebar; `"beside"` opens it outside the sidebar to
  its left, as wide as its content, falling back to `"under"` when the canvas
  row has no room for it.
- **`@jiscribe/geometry` exports `unionBoundingBoxes`**, the smallest box
  enclosing a list of bounding boxes (`null` entries skipped, `null` when none
  is left).

### Changed

- **Text too small to read is not drawn.** A shape's text or a connector's
  label whose largest type size would show below 4 CSS px at the current zoom
  is hidden, and comes back on zooming in. Exported images and
  `capture_canvas` pictures still hold every text at any zoom, and a hidden
  label's connector can still be picked by its line.
- **Dragging objects no longer redraws them on every frame.** The dragged
  shapes keep the elements they had when the drag started and are shifted by a
  transform, and a connector off screen is no longer routed, during a drag or
  on a document's first draw, just to find that it is off screen. Dragging a
  selection of a few thousand shapes takes about half as long per frame. An
  orthogonal connector without vertices whose two ends both move may sit
  up to half a unit off its route until the drop routes it again. Every object
  and connector on the canvas now sits in a group of its own for that
  transform, which image export folds away. For plugin authors: a type's
  `moveByDelta` must move its drawing as a whole and change nothing else, since
  the drag draws the start state shifted rather than what `moveByDelta`
  returned.
- **Undo, redo and an external change no longer rebuild the whole document.**
  Objects a step or an external edit leaves alone stay the same objects, so
  their routes, text layout and rendering are reused and only what changed is
  redrawn. A document passed in that differs only in key order is recognized as
  unchanged, and undoing back to a document the host passed saves those bytes
  as they were.
- **Swapping an `awsIcon`'s icon from the menu carries its label along.**
  While the label is still the one the old icon comes with (the short name a
  stencil places, `S3`), picking another icon replaces it with the new one's
  (`Lambda`). A label that was edited, or emptied, is left as it is.
- **`interaction.getStatus().drag` names every kind of drag.** It was `"move"`,
  `"transform"` or `"other"`; it is now one of `"move"`, `"transform"`,
  `"marquee"`, `"pan"`, `"menu"`, `"connector"`, `"stencil"`, `"draw"`,
  `"vertex"`, `"label"`, `"segment"`, `"selectionControl"`, or `"inert"` for a
  drag nothing acts on. `DragKind` follows. `null` still means no drag.
- **For plugin authors, breaking changes to `CanvasControllerState`:** what the
  canvas is in the middle of is two fields. `mode` is `{ kind: "normal" }`,
  `{ kind: "textEdit", draft }` (the former `textEditState`, now `draft`) or
  `{ kind: "draw", preset }` (the former `shapeDrawing` while armed).
  `drag` is the drag in progress or `null` (the former `activeDrag`), named by
  `kind`; what belonged to one drag rides on it — the former `areaSelection`
  (`kind: "marquee"`, its rectangle as `rect`), `connectorDraft`
  (`"connector"`, as `draft`), `stencilLibraryDrag` (`"stencil"`),
  `shapeDrawing.preview` (`"draw"`, as `rect`), and `snapFeedback`,
  `axisLockFeedback` and `edgeScrollEnabled` on every kind. The former
  `activeDrag.movePreview` and `activeDrag.resize` are on the `"move"` and
  `"transform"` kinds only, so narrow on `kind` before reading them. The removed
  fields are `textEditState`, `activeDrag`, `shapeDrawing`, `areaSelection`,
  `stencilLibraryDrag`, `connectorDraft`, `snapFeedback`, `axisLockFeedback`
  and `edgeScrollEnabled`. A command that tested `textEditState !== null` tests
  `mode.kind === "textEdit"`; one that opens an editor writes
  `mode: { kind: "textEdit", draft }`. The types — `CanvasMode`,
  `TextEditDraft`, `CanvasDrag`, `CanvasDragDetail` and `DragRect` — are on
  `@jiscribe/canvas/unstable` beside `CanvasControllerState`. Hosts are
  unaffected.

### Fixed

- **An orthogonal connector no longer hugs one shape's margin when a route
  centred between the shapes is just as good.** Floating-point noise in two
  equally good routes' costs decided between them before the preference for
  the centred one was consulted, so a connector could change course between
  the editor and the reopened file.
- **Opening a text edit while a drawing tool is armed disarms the tool.**
  Enter after Select All, or a double click on a shape, used to leave the tool
  armed under the editor, so the next drag on the canvas drew a shape.
- **A touch drag on a shape keeps the text being edited in it.** The first
  frame of the drag put the old text back.
- **The frame around a multi-selection follows the connectors as they are
  drawn.** A connector ending on a diamond, or the stubs of an orthogonal route
  between two ER entities' columns, could stick out of the frame. A connector's
  label is now left out of the frame from the start, so the frame no longer
  shrinks on the first frame of a resize.
- **Drag, wheel and fling updates show up in the frame that processed the
  input instead of the next one**, about 16 ms sooner. On heavy documents,
  where that would halve the frame rate, the canvas falls back to the
  one-frame-late update after two slow frames and tries again now and then.
- **An exported image no longer gets a background rect for a background that
  paints nothing.** Only `transparent` and `rgba(0, 0, 0, 0)` counted as
  transparent, so a background such as `rgba(255, 255, 255, 0)` or `#ffffff00`
  still put a full-size invisible rect under the drawing. Any color with zero
  alpha now leaves the rect out, and the color swatches show the transparency
  checker for every such color.
- **A connector label whose background or border color has no blue keeps its
  box in an exported image.** An opaque color ending in 0, such as
  `rgb(255, 255, 0)`, was taken for transparent and the label's background or
  border was left out of the SVG and PNG.
- **Emptying a slot of rows headlessly writes `[]`, as the canvas does.**
  `docOps.setText` (and with it `set_text`) wrote an empty text into a slot
  that holds rows, such as a UML record's attributes, as `[""]`: one empty row,
  where the canvas writes no rows at all.
- **The Claude Code plugin starts the newest jiscribe-mcp.** It ran
  `npx -y jiscribe-mcp@0.12`, and npx keeps using whichever version first
  satisfied that range, so a machine that had once run 0.12.1 went on running
  it after 0.12.2 was out. It now runs `npx -y jiscribe-mcp`, which npx checks
  against the registry on every start.

## [0.12.1] - 2026-10-20

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
- **For plugin authors: a selection control can be drawn under the selection
  outline.** `layer: "belowOutline"` puts it below the outline, the outlines of
  picked parts included, where `"belowHandles"` and `"aboveHandles"` (still the
  default) both sit above it.

### Changed

- **`setInlineTextStyle` / `setInlineTextStyles` refuse an `occurrence` that is
  not a whole number**, as they already refused one below 1 or past the last
  occurrence. The AI tools' schema already took integers only, so only a
  direct caller of the doc ops sees it.
- **`table_set_cell_style` overrides what part of a cell's text set for the
  same property.** A cell typed bold in part and then set to `fontWeight:
"normal"` stayed bold in that part; it now drops the property from the
  stretches, as `set_style` does on a shape's text and as styling a cell on
  the canvas already did.
- **The selection outline is drawn over the grips of a table and an ER
  entity.** The row, column and corner grips of a table and the column and lane
  grips of an `erEntity` covered the outer half of the outline where they abut
  the shape; the outline now runs unbroken over them, and each grip's border is
  closed on all four sides and stops at the shape's box instead of running half
  its width into it.

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

[Unreleased]: https://github.com/gznnk/jiscribe/compare/v0.12.2...HEAD
[0.12.2]: https://github.com/gznnk/jiscribe/compare/v0.12.1...v0.12.2
[0.12.1]: https://github.com/gznnk/jiscribe/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/gznnk/jiscribe/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/gznnk/jiscribe/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/gznnk/jiscribe/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/gznnk/jiscribe/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gznnk/jiscribe/releases/tag/v0.8.0
