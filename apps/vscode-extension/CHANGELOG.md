# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-08-08

The largest release so far. The shape set grew from 8 drawable types to 47, text
became addressable per compartment, connectors now follow the real silhouette of
a shape and can be routed by hand, and touch input is supported.

### Added

#### Shapes

The shape library is now organised into categories, each opening as a flyout from
the toolbar: **Flowchart**, **UML**, **Container**, **General**, and **Annotation**,
alongside the pinned Rectangle / Ellipse / Polyline / Polygon / Sticky / Markdown.

- **Flowchart set (18 shapes)**: `subroutine`, `trapezoid`, `manualInput`, `card`,
  `delay`, `display`, `extract`, `cross`, `multiDocument`, `storedData`, `loopLimit`,
  `offPageConnector`, plus `stadium`, `parallelogram`, `hexagon`, `document` and the
  existing `diamond` / `db`. On-page connector, Process and Decision are also
  available as presets. The palette is laid out in meaning groups (core flow →
  data & I/O → manual → loop bounds, markers and connectors).
- **General / system shapes (15)**: `server`, `browserWindow`, `terminalWindow`,
  `folder`, `file`, `package`, `envelope`, `queue`, `gear`, `lock`, `shield`,
  `smartphone`, `laptop`, plus `actor` and `cloud` — aimed at architecture diagrams
  and code-reading notes.
- **Container shapes**: `container` with **Frame** / **Boundary** (dashed) / **Zone**
  (tinted) presets, for enclosing a region of the diagram. Clicks pass through the
  body, so only the header band and the border select it; the title lives in the
  header. Dragging the container moves what it encloses via the existing group
  mechanism. The header fill is its own colour field (`headerFill`, defaults to
  `auto`), and its height can be dragged.
- **UML class shapes**: `record` now has variable compartments — `stereotype`,
  `name`, `attributes` and `operations`, where every key you write becomes a
  compartment and every key you omit disappears. Ships as five stencils: Object,
  Class, Interface, Abstract Class and Enum, each with its own icon and sample
  notation.
- **Annotation shapes (5)**: `brace`, `bracket`, `bracketWithStem`, `note` and
  `callout`. The three bracket-family shapes carry their label outside the band, so
  the bracket stays thin while the label grows, and their tip can be dragged.
- **Markdown is now its own shape type** (`type: "markdown"`) instead of a style
  attribute on a rectangle. See **Changed** for the migration.

#### Text

- **Named text slots**: A shape can hold several independently styled pieces of
  text. Click a compartment of a selected shape to select just that slot — text
  styling then applies to that slot only, the object menu narrows to text items,
  the selection frame turns dashed, and **Tab** / **Shift+Tab** cycle between slots.
  **Escape** clears the slot first and the object second.
- **Italic, underline and strikethrough** for text, carried all the way through to
  PNG / SVG export.
- **Text regions follow the shape's silhouette** rather than its bounding box, so
  text no longer spills out of trapezoids, triangles and other non-rectangular shapes.
- **Line wrapping is measured, not estimated**, so a `record`'s name band and
  connector labels track their real height — including live while you type.
- **Shapes that are drawn edge-to-edge hang their label below the box** (actor,
  server, package, envelope, queue, gear, lock, cross, extract), auto-sized from
  the text content.

#### Connectors

- **Endpoints snap to a shape's true outline**, not its bounding rectangle, so
  connectors on diamonds, hexagons, clouds and the rest meet the shape where it is
  actually drawn.
- **Anchors sit where the shape's form wants them**: an `anchorRegion` per type
  pulls the four side anchors onto the real edge, shapes can declare extra named
  anchors (the tips of `brace` / `bracket` / `bracketWithStem`), and dropping an
  endpoint away from a named anchor pins it to an arbitrary position along an edge.
- **Right-angle routes can be shaped by hand**: drag any segment of an orthogonal
  connector to move it. Runs that touch an endpoint keep their length and stay
  joined to the shape, collinear runs move as one, and the route is cleaned up
  after each drag so every saved corner is a real right angle. **Reset route to
  automatic** in the context menu discards the manual route. Straight connectors
  can be dragged the same way.
- **Connector labels can be dragged** along and away from the line (magnetically
  snapping to the line, **Ctrl** to release), and double-clicking a label-less
  connector creates the label at the point you clicked.
- **Seven new UML / ER arrowheads** (8 → 15): Cross and Hollow Circle for UML,
  plus the five crow's-foot notations (Many, One-Many, Zero-Many, One, Zero-One).
- **Routing defaults follow the anchor kind** — a connector created on a centre
  anchor starts out straight, one created on a side anchor starts out orthogonal.
- **Dragging a free endpoint snaps it to the fixed end's axis**, so a straight
  horizontal or vertical connector is easy to land.
- The transform frame and connection anchors are hidden while dragging.

#### Touch

- **Two-finger pinch to zoom, one-finger drag to pan**, including handing over from
  a pan to a pinch when a second finger lands.
- **Long-press opens the context menu.**
- Drag thresholds are measured in screen pixels with a wider threshold for touch,
  and deselection / text-edit commit wait for the tap to be confirmed.

#### Canvas

- **Background colour can be set in the document** (`background`, a literal CSS
  colour at the top level). It survives save, undo/redo and external sync, and is
  applied to image export as well. The grid colour is derived from it.
- **Grid visibility and size are configurable**, and the grid is now **off by
  default** (see **Changed**).
- **Documents with unrecognised content load instead of failing.** Unknown object
  types, unknown enum values and unknown anchor kinds are dropped at the parse
  boundary and reported as warnings; groups left empty and connectors attached to a
  dropped object are removed with them. Previously a single unknown value rejected
  the whole file.
- **Slider keyboard control**: arrow keys adjust the property, and a burst of key
  presses collapses into a single undo entry. Clicking the slider track now also
  updates the property.

### Changed

- **BREAKING (file format)**: `textType` was removed. A `rect` with
  `textType: "markdown"` must become `type: "markdown"` — loading the old form
  reports a diagnostic pointing at the replacement, but does not convert it
  automatically. Markdown rendering on other shapes (sticky, callout, …) is gone.
- **BREAKING (file format)**: The UML stencil id `entity` was renamed to `object`.
- **Syntax highlighting in Markdown code fences was removed.** The highlight theme
  CSS was never loaded in any host, so `hljs-*` classes were emitted with no colour,
  and highlighting never appeared in PNG / SVG export at all. Removing
  `highlight.js` cut the webview bundle by 14% (1.15 MB → 0.99 MB). Code fences are
  still rendered, and `language-*` classes remain, so a highlighter can be added
  back later.
- **The grid is hidden by default.**
- **Default shape colours changed.** `fill` / `stroke` / `fontColor` set to `auto`
  now resolve through dedicated theme entries (shape ink and shape surface) rather
  than the canvas foreground / surface, so shapes read correctly against the canvas
  in both light and dark VS Code themes.
- **The bundled AI authoring assets (guide, reference, JSON schema) are now
  generated from the shape definitions themselves**, which removes the drift that
  had crept into the connectable list and several default values. They cover all 47
  shapes. If you use AI authoring, re-run the **Set up AI** command to refresh the
  assets under `.jiscribe/`.

### Fixed

- **Math (KaTeX) in Markdown shapes is typeset correctly** — the webview was
  missing the KaTeX stylesheet, so formulas rendered as unstyled markup.
- **Text no longer crawls while panning.** The rendering camera is snapped to device
  pixels, so glyphs and shape outlines move together instead of drifting apart.
- **Text no longer shakes by a pixel while resizing a shape.**
- **The editing textarea lines up with the rendered text.** Its transform is now
  composed from the same local origin as the display layer, its height matches the
  line box exactly, and the auto-grow mode stops at the bottom edge of the shape.
- **Aspect-ratio lock can be toggled on a group selection** (the control was inert).
- **Shortcuts that cannot run no longer swallow the key event**, so the keystroke
  falls through to VS Code instead of disappearing.
- **The object menu is hidden while editing text**, where it used to cover the text
  being typed.
- **Double-click no longer requires both clicks to land on the same element**, which
  makes label editing reliable on top of insertion handles.
- **The arrowhead preview uses the same line width as the arrow it creates.**
- Fixes to shapes and features introduced in this release are not listed
  individually.

### Performance

- **Off-screen objects are skipped.** Viewport culling keeps objects outside the
  visible area out of the reconcile pass, which is the main win on large documents.
- **Dragging no longer copies the whole object map each frame** — it now goes
  through a copy-on-write view.
- **Connector routes are memoised on their geometry**, so edits that do not move
  anything (colour, text, style) no longer re-route the diagram.
- **Multi-select resize** caches vertex collection at drag start instead of
  re-collecting every frame, and **marquee selection** skips recomputation on frames
  where the hit set is unchanged.
- Connection-drag anchor resolution, the object menu's group lookup during drags,
  paste's group-frame rederivation, Markdown re-parsing on the edit toggle, and the
  unknown-content strip pass all do less redundant work.
- The webview bundle is 14% smaller (see **Changed**).

## [0.6.1] - 2026-07-13

### Fixed

- **Panning and zooming no longer shake the canvas.** While panning or zooming continuously (trackpad or pinch), the view could rapidly snap back and forth and make the whole diagram tremble; the viewport is now updated so this feedback loop can no longer happen.
- **Saving `.jis.png` / `.jis.svg` files is more reliable.** Saving from a hidden editor tab no longer leaves a stale image — it re-renders when the tab is shown again — and the embedded source is kept in sync with the bytes written to disk, so a later edit always starts from the saved file.
- **The drag preview matches the font of the shape it creates**, so text no longer looks different while dragging a shape from the library than it does once dropped.

## [0.6.0] - 2026-07-12

### Added

- **Editable images (draw.io-style round-trip)**: The canvas can now be exported as a PNG or SVG that stays editable. Right-click the canvas and choose **Export…**, then pick the format — **PNG** (`.jis.png`, with the document embedded as a PNG `iTXt` chunk) or **SVG** (`.jis.svg`, with the document embedded in SVG `<metadata>`) — the margin kept around the content, whether to embed the source data, and whether to make the background transparent. Exports are fit-to-content, and the file is saved into your workspace rather than the browser download folder. Both files render as plain images everywhere (GitHub, Markdown previews, image viewers). Turning the source embed off produces a plain image saved as `.png` / `.svg` (no `.jis` marker, not re-editable).
- **Open `.jis.png` / `.jis.svg` in the canvas editor**: Files with these double extensions now open in the Jiscribe canvas editor, restoring the full document from the embedded source. Editing and saving re-renders the image (fit-to-content) with the updated source re-embedded, so the file always stays a valid, up-to-date image — the same workflow as draw.io's `.drawio.png`. If the editor UI cannot render at save time, the previous image is kept and only the embedded source is updated, so edits are never lost.
- **Database (cylinder) shape** _(experimental)_: A new `type: "db"` cylinder primitive for data stores in architecture diagrams. It is available in the shape library (next to Polygon), can be drawn like the other shapes, and its text automatically flows below the cap so it never overlaps the rounded top. This is the first of a broader set of shapes planned for upcoming releases.
- Refreshed extension icon (new teal line-art mark).

### Fixed

- **Middle-click now pans the canvas** consistently instead of being swallowed by other handlers.
- **Keyboard shortcuts are scoped to the focused canvas**, so shortcuts no longer fire in the wrong editor when several Jiscribe canvases are open.
- **Snap and axis-lock guides follow your VS Code theme** (they were a hardcoded blue) and their dashes stay fixed in canvas space instead of shimmering while you drag.
- **Text-editing scrollbar** moved to an outer gutter so it no longer shifts word-wrap and misaligns the text while editing.
- **Copy / Paste / Duplicate** keeps free connector endpoints and waypoints aligned by offsetting them together with the shapes.
- **Self-loop connectors** can no longer attach to the invalid `center` anchor; such documents are now rejected up front.
- Connectors can no longer be accidentally swept into a group.
- Rapid consecutive pastes are serialized in order, and a save-flush race that could deliver a stale document was fixed.
- Hardened several geometry edge cases (division-by-zero guards, zero-size groups prevented).

### Performance

- **Hidden editor tabs no longer keep their webview resident** (`retainContextWhenHidden: false`), cutting memory use when many canvases are open.
- The webview bundle is smaller — `highlight.js` was trimmed to its common language set (~47% reduction).
- Numerous canvas and geometry hot paths — connector routing, bounding boxes, frame corner/label recomputation, marquee selection, per-frame gesture DOM reads, and history reconstruction — allocate less and do less redundant work, smoothing drags and routing on large documents.

## [0.5.1] - 2026-07-04

### Added

- **Connector labels**: Connectors can now carry a text label — double-click a connector to add or edit one. Labels support text styling (color, size, bold) plus a background color and border style, all editable from the object menu. Clearing the label text keeps its styling and placement, so re-typing later restores the same look.
- **Keyboard zoom snaps to fixed steps**: Zoom In / Zoom Out now snap to fixed zoom stops (…, 50%, 75%, 100%, 125%, 150%, …) instead of multiplying by a ratio, so zooming in and back out always returns you to exactly 100%. Wheel zoom remains continuous.

### Fixed

- **Connector routes no longer flicker while dragging an attached shape.** Route selection is now fully deterministic — ties between equally good routes (including mirror-symmetric ones) are broken by a fixed total ordering, so bend points stay put during drags instead of oscillating between equivalent routes.
- **Connector endpoints no longer drift** from the shapes they attach to: bounding-box composition was unified into a single implementation shared by rendering, Zoom to Fit / Zoom to Selection, and multi-select bounds, so they can no longer disagree.
- **Drawing mode now exits when you switch intent**: starting a drag & drop from the shape library, or pressing a shape that doesn't support click-to-draw (e.g. Sticky), now clears the active drawing mode instead of leaving the crosshair armed.
- **Rounded rectangles keep their corner radius** when a document is loaded (the `rx` style was dropped during state construction), and the internal `parentId` bookkeeping field no longer leaks into saved `.jis.json` files.
- Double-click detection no longer fires false positives.

### Changed

- **BREAKING (file format)**: A connector endpoint's `owner` is now just `{ "id": "..." }` — the redundant `type` field was removed and is no longer accepted by schema validation. To migrate an existing `.jis.json`, delete the `type` key from every connector `source`/`target` `owner`. The connectable-type rule (rect / ellipse / diamond / sticky) is still enforced, now purely via reference resolution.
- **BREAKING (file format)**: `"center"` is no longer a valid `connectPoint` id (it never resolved to anything); connect points are now only the four side midpoints. Center attachment remains available via the center anchor.
- `connector.points` is now optional and defaults to `[]`, so hand-written or AI-generated documents no longer need to spell out an empty waypoint list.
- The bundled AI authoring assets (guide, reference, JSON schema) were updated for all of the above and strengthened for better first-shot generation. If you use AI authoring, re-run the **Set up AI** command to refresh the assets under `.jiscribe/`.

### Performance

- Geometry hot paths — bounding boxes, intersection tests, and rotated-endpoint resolution — allocate less and do less redundant trigonometry, which smooths out dragging and routing on large documents.

## [0.5.0] - 2026-06-28

### Added

- **Routed connectors with waypoints**: Connectors are now drawn as multi-segment polylines instead of a single straight line. You can drag a connector's mid-point to add a waypoint, and move existing waypoints, to route a line around other shapes by hand.
- **Automatic orthogonal routing**: Connectors can route themselves with clean right-angle (orthogonal) segments that avoid the shapes they attach to. Routing is now switchable per connector from the object menu (orthogonal or straight), and **orthogonal is the default** for newly created connectors.
- **Self-loop connectors**: A connector can now attach both ends to the same shape, drawn as a loop back to itself — useful for state diagrams and retry/feedback flows.
- **Diamond shape**: Added a diamond primitive for flowchart decision/branch nodes. It is available in the shape library and can be drawn like the other shapes.
- **Click zoom to reset**: Clicking the zoom-percentage readout in the toolbar resets the view to 100%.

### Fixed

- **Zoom to Fit / Zoom to Selection** no longer misbehaves on degenerate selections: a zero-area selection is now a no-op, and a perfectly horizontal or vertical line (zero on one axis) now frames correctly instead of failing to fit.
- **Edge auto-scroll** no longer fires spuriously when you grab an object near the canvas edge; scrolling now arms only after the pointer leaves the canvas.
- **Context menus** close more predictably: submenu background clicks no longer dismiss the menu, and a press now closes an open context menu consistently across handlers.
- Wheel/zoom event handling is scoped to the canvas container instead of the whole document, so scrolling outside the canvas no longer zooms it.
- Hardened `.jis.json` loading: documents are validated against the schema's numeric and structural constraints, and unknown object types, empty groups, cyclic clipboard data, and connectors with invalid endpoints are rejected up front. Several rendering-lifecycle issues (stale animation frames after unmount, frame-ordering) were also fixed.
- **Schema validation no longer silently breaks in restricted/untrusted workspaces.** Generated `.jis.json` files no longer embed a `$schema` URL pointing at `https://schema.jiscribe.dev/...`. VS Code prefers an in-document `$schema` over the extension's bundled schema and tries to download it, which fails in untrusted/restricted workspaces (`Unable to load schema from 'https://schema.jiscribe.dev/v1/jiscribe.schema.json': Location ... is untrusted.`) — leaving the file with no validation at all. Validation now always uses the schema bundled with the extension, so it works offline and regardless of workspace trust. Existing files keep working; the `$schema` key is dropped the next time they are saved.

### Changed

- New connectors default to **orthogonal** routing, and the bundled AI authoring guide, reference, and schema now cover diamonds, connector routing, waypoints, and self-loops. The document `version` stays at `1` (these additions are backward-compatible). If you set up AI in an earlier version, re-run the **Set up AI** command to refresh the assets under `.jiscribe/`.

## [0.4.0] - 2026-06-22

### Added

- **Theme-following colors ("Auto")**: Stroke, fill, and font color can now be set to **Auto**, which resolves to your VS Code color theme at render time. The data itself stays theme-independent, so files stay portable and readable in both dark and light themes. Rectangles, ellipses, polygons, and new connectors now default to Auto for stroke and font color, the color picker has an **Auto** button, and the Markdown preset follows the theme too.
- **Inline SVG objects**: A new `type: "svg"` object lets you embed complex artwork — icons, logos, gradients — that the built-in shapes can't express. SVG content is sanitized on render and falls back to a placeholder if it can't be parsed. Its natural size is derived automatically from the `viewBox`, so authored `.jis.json` only needs the SVG text and a box. SVG objects are added via AI or by hand-editing `.jis.json` (they are not in the shape library), and they don't support connections or text editing.
- **Draw mode for Polygon**: Polygons can now be drawn by dragging out an area in the shape library, just like the other shapes, fitting a regular polygon to the region you drag.

### Fixed

- Text editing no longer starts on objects that have no text (SVG, polyline, polygon, connector, and group). Double-click and Enter on these no longer open a ghost text editor.
- The drawing-preview outline now matches the color the shape will have once placed, following both the theme and the preset instead of always rendering black.
- Fixed a group-bounds update path that never ran when the top-level object wasn't a group.

### Changed

- The AI authoring guide and reference now cover Auto colors and inline SVG objects, and clarify that connectors can only attach to rectangles, ellipses, and sticky notes (not polylines, polygons, groups, or other connectors), preventing AI-generated diagrams from being rejected. If you set up AI in an earlier version, re-run the **Set up AI** command to refresh the guide, reference, and schema under `.jiscribe/`.

## [0.3.0] - 2026-06-20

### Changed

- **Connectors now share a single stacking order with shapes (breaking)**. Connectors are no longer drawn always-on-top from a separate list. They live in the same z-order as every other object, so you can send them to back or bring them to front like any shape. Selecting a connector now also shows the **Stack Order** controls in the object menu.

### Removed

- **The top-level `connectors` array in `.jis.json` has been removed (breaking, no migration).** Connectors are now stored inline in `root`, mixed in among the other objects, where array order is the stacking order (back to front). The document `version` stays at `1`.

  To reuse a file authored before this release, merge its `connectors` entries into `root`. Appending them to the end of `root` reproduces the previous always-on-top appearance:

  ```jsonc
  // Before
  {
    "version": 1,
    "root": [ /* shapes */ ],
    "connectors": [ /* connectors */ ]
  }

  // After
  {
    "version": 1,
    "root": [ /* shapes */, /* connectors */ ]
  }
  ```

### Fixed

- **Connectors with both endpoints free are now rejected.** A connector must be attached to a shape on at least one end; floating connectors are flagged in the Problems panel and dropped on load. This also fixes both-ends-free connectors being spuriously duplicated on Copy/Duplicate.

## [0.2.0] - 2026-06-18

### Added

- **Set up AI**: A new command that configures your AI assistant to author Jiscribe diagrams. It places an authoring guide, a reference, and the schema under `.jiscribe/`, and adds a small adapter for each selected agent — **Claude Code**, **Cursor**, and **GitHub Copilot** — so they know how to generate and edit `.jis.json`.

### Changed

- Renamed the **New Empty Jiscribe Canvas** command to **New Jiscribe Canvas**.
- Updated the bundled AI authoring guide and reference for accuracy (default values, text types, sticky notes) and rewrote them in English.

### Removed

- Removed the **Export Jiscribe Canvas Schema** command (superseded by **Set up AI**). The schema is still published at `https://schema.jiscribe.dev/v1/jiscribe.schema.json`.

## [0.1.3] - 2026-06-17

### Added

- **Dark Theme UI**: The canvas UI has been redesigned to follow your VS Code color theme, with a refined dark design across toolbars, menus, and icons.
- **Axis-Locked Movement**: Hold `Shift` while dragging objects or polyline/polygon vertices to constrain movement to the X or Y axis. Viewport-wide guide lines and snapping back to the start position make precise alignment easier.
- **Arrow Key Nudging**: Move the selected objects with the arrow keys. Repeated nudges are grouped into a single undo step.
- **Center Snapping**: Objects now snap to the horizontal and vertical centers (`hCenter` / `vCenter`) of other shapes.
- **Toolbar Zoom**: The zoom `+` / `-` buttons in the toolbar are now wired to the command system.

### Fixed

- **Connectors**: Connector endpoints are now edited directly on the connector for more reliable re-routing.
- **Hollow Arrows**: Removed the white fill from hollow arrowheads, and the line now terminates at the base of the arrow.
- **Context Menu**: Pasting with an empty clipboard no longer leaves the context menu open.
- **Defaults**: New shapes now use a neutral gray for their default stroke and font color.
- Fixed a division-by-zero error when transforming grouped frames, limited hover detection to elements inside the canvas, and made the transparency indicators and shortcut list follow the active theme.

## [0.1.2] - 2026-06-13

### Added

- **Keyboard Shortcuts Help**: Added a new modal pane to view all available keyboard shortcuts. You can open it by pressing `?` or by clicking the `?` button in the bottom right corner of the canvas.
- Improved the Usage section in the README to emphasize command palette and AI generation features.

## [0.1.1] - 2026-06-13

### Fixed

- **TextEditor**: Fixed line-height mismatch between the display layer and the textarea.
- **TextEditor**: Vertical alignment (`verticalAlign`) is now preserved while editing text.
- **TextEditor**: Fixed incorrect `verticalAlign` values in the alignment menu that prevented the TextEditor from opening.
- **TextEditor**: Scrolling the canvas no longer interrupts an active text edit session.
- Various minor bug fixes.

## [0.1.0] - 2026-06-12

First public Beta release.

### Added

- Custom canvas editor for `.jis.json` files, opened automatically in VS Code.
- Two-way sync between the visual canvas and the underlying JSON text editor.
- Canvas primitives: rectangles, ellipses, polylines, and polygons.
- Connectors to link shapes natively.
- Grouping of existing objects.
- JSON Schema integration for auto-completion, served at
  `https://schema.jiscribe.dev/v1/jiscribe.schema.json`.
- Problems panel integration for syntax errors and broken connections.
