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
  and so do `jiscribe op <file> connect` / `connect_many`, so placing the label
  no longer takes a second `update_connector`. Either one without non-empty
  `label` text is refused.

### Changed

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

### Removed

- **Breaking: the floating menu no longer opens the properties sidebar.** The
  **…** button at its end is gone, and with it the `menuPropertyPanel` key of
  `CanvasMessages`, so a host whose messages object names that key gets a type
  error until it drops it. The menu shows only while the chrome is collapsed,
  and opening a sidebar from it switched the whole chrome to its expanded form. With
  the default bar the sidebars are opened by the switch for both; a host
  composing `DEFAULT_TOOLBAR_PROPERTIES_SECTION` keeps a properties toggle on the
  collapsed bar, and a canvas with no top bar has no way into the sidebars.

### Fixed

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
  JP, so the MCP server's `measure_text`, `add_object` and `diagnose_canvas` and
  the CLI's `measure` / `diagnose` failed on any text holding one. fontkit cannot
  read these empty glyphs; their advance is now read from the font's `hmtx`.
- **The drawing guide no longer says `diamond` and `stadium` lay text out over
  the whole box.** They never did: a diamond uses its inscribed rectangle and a
  stadium the band between its caps, so text sized to the box wrapped. The guide
  and both shapes' schema descriptions now give the real region.

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
