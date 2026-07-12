# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
