# Changelog

All notable changes to the Jiscribe extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-09-02

Text now decides its own box. A shape can let its height follow what is typed
into it, a `text` shape can be given a fixed width to wrap in, and body text can
be anchored to the whole shape instead of the region its type carves out. Fonts
are no longer whatever the viewer happens to have installed — four families ship
with the extension and are what measurement uses, which is also what makes the
first three possible. A document can declare how it wants to be opened,
`lucideIcon` draws any of Lucide's 1767 icons by name, and the shape set is now
51 drawable types. Starting a canvas is now just creating an empty file — the
New Jiscribe Canvas command is gone — and an image document open in a tab
follows edits made to the file from outside.

### Added

#### Text

- **A shape's height can follow its text.** **Fit height to text**, in its own
  section just above Transform in the object menu, drops `height` from the
  document and derives it from the content instead — as you type, as you widen
  the shape, across undo and across an edit made in the JSON editor. Dragging a
  vertical resize handle turns it back off; the horizontal handles keep it on, so
  widening a shape to lose a line is a single drag. The derived height leaves
  0.75em of breathing room above and below the text (24 px at the default 16 px),
  so a `stadium` no longer has to be tall to be round. Available on the types
  that draw their text inside the box; a type that hangs its label outside
  (`actor`, `brace`, …) still needs an explicit height.
- **A `text` shape can wrap at a fixed width.** **Wrap at a fixed width**, at the
  end of the text shape's menu, saves `width` and wraps to it; **Fit width to
  text** goes back to measuring. In fixed-width mode the shape grows side resize
  handles — `text` had no resize handles at all before. Switching over records
  the width it was already drawn at, so nothing moves at the moment you switch.
  The height is always measured and is never written to the file.
- **Body text can be anchored to the whole shape.** **Fit text to the full
  height** appears right after the text section for the types whose text region
  bites into the box vertically (`db`, `document`, `card`, `ellipse`, …). With it
  on, vertical alignment is computed against the whole height, so a row of
  differently shaped boxes of the same height lines its text up instead of each
  type drifting by its own cap or wave. Auto height follows the same basis.
- **A font picker.** Sans, serif, monospace and handwriting, at the top of the
  text section, each row drawn in its own face. The faces are bundled with the
  extension rather than requested from the network, and Japanese is split by
  unicode-range so only the ranges a document actually draws are loaded.
- **Connector labels get the same four fonts**, at the top of the label text
  section.

#### Shapes

- **`lucideIcon` draws any of Lucide's 1767 icons by name**, in the new **Icon**
  flyout at the end of the toolbar. The flyout carries 20 common icons for
  clicking straight onto the canvas, and the object menu opens a searchable grid
  — 149 icons ordered by use before you type, all 1767 once you do. Old names
  (`user-circle`) and alternative spellings (`fileText`) resolve to the current
  name, and a name that cannot be resolved comes back with near misses rather
  than an empty box. The shape holds no text and is not a connector endpoint; it
  keeps its aspect ratio by default. The shape set is now 51 drawable types.

#### Documents

- **A document can declare how it wants to be opened.** A new `view` object next
  to `root` carries a frame around the drawing (`padding`), how to fit it on open
  (`open`: `fit-width` or `fit-all`), and whether panning is fenced to the
  content (`scroll`: `content` or `infinite`).

  ```json
  {
  	"version": 1,
  	"view": {
  		"padding": { "top": 48, "right": 64, "bottom": 64, "left": 64 },
  		"open": "fit-width",
  		"scroll": "content"
  	},
  	"root": []
  }
  ```

  The padding is also the margin of an exported image. A document without a
  `view` behaves exactly as before and is still saved without one.

#### Files

- **A new canvas is just an empty file.** Create a file with a canvas
  extension — from the Explorer's **New File...** or `touch` — and open it: an
  empty `.jis` / `.jis.json` shows a blank canvas instead of a JSON syntax
  error, and an empty `.jis.png` / `.jis.svg` a blank image document instead of
  "no embedded source". The file stays empty on disk until the first edit
  (text) or the first save (image) writes it.
- **An open `.jis.png` / `.jis.svg` follows the file on disk.** A change made
  outside the editor — a git checkout, an AI writing the file, another
  program — used to go unseen until the tab was reopened, and the next save
  overwrote it. Now an editor with no unsaved edits adopts the disk state
  silently, the way a text editor does; one with unsaved edits asks whether to
  reload (undoable) or keep the edits.

#### Canvas

- **Exported PNGs carry the fonts they were drawn with.** The rasterizer renders
  the SVG in a document of its own, which does not inherit the page's fonts, so
  the export used to fall back to whatever the host had and came out wider than
  what was on screen.

### Changed

- **Text is drawn and measured in fonts that ship with the extension.** The
  default used to name `Noto Sans JP`, which was never actually loaded — the real
  glyphs were whatever the viewer had, and measurement could disagree with
  drawing. The default is now `"Source Sans 3", "Noto Sans JP", sans-serif` from
  the bundled set. **Existing documents can look different**: glyph shapes, line
  heights, and the measured size of anything sized from its content — a `text`
  shape, a hanging label, a connector label — along with the connectors attached
  to them.
- **Font weights 500 and 600 are now drawn as written.** Only 400 and 700 were
  bundled, so a document asking for a weight in between was drawn at the nearest
  bundled face while measurement used the real one — the box and the glyphs
  inside it disagreed. Every bundled face now carries 400, 500, 600 and 700
  upright — bar the Japanese handwriting face, which only draws 400 and 600 —
  which adds about 14 MB to the fonts the extension carries. Italic still ships
  at 400 and 700 only, so an italic weight in between falls back to the nearer
  of those.
- **Text is re-measured when the fonts finish loading**, so a document may settle
  once shortly after it opens instead of keeping the boxes it measured against a
  fallback face.
- **A document saved by this version does not open cleanly in 0.8.0.** A shape
  that omits `height` is rejected outright; a `lucideIcon` is dropped as an
  unknown type and is gone once that older version saves; a fixed-width `text`
  opens as one long unwrapped line and loses `textLayout` and `width` on save.
  Reading older documents is unaffected.
- **Snapping stops while the canvas is auto-scrolling at an edge.** Holding a
  drag against the edge used to walk the shape across one snap candidate after
  another while only the view was moving. The tick the viewport drives itself is
  now treated like holding Ctrl; releasing still snaps.
- **The bundled AI authoring assets cover the new declarations** — auto height,
  fixed-width text, the vertical basis, `view`, `lucideIcon` and the font set —
  and the schema grew from 111 KB to 127 KB. If you use AI authoring, re-run the
  **Set up AI** command to refresh the assets under `.jiscribe/`.

### Removed

- **The New Jiscribe Canvas command.** Creating an empty file (see _Files_
  above) replaces it: any way you already create files — the Explorer, a
  terminal, an AI agent — now starts a canvas, without a command of its own.

### Fixed

- **Saving As writes the format the file name says.** Saving a canvas image
  under a plain `.svg` name (no `.jis.`) used to write PNG bytes into it,
  because only `.jis.svg` was recognized as SVG.
- **Closing a file clears its entry in the Problems panel.** Validation errors
  used to outlive the tab that produced them.
- **Changing a font size no longer throws you out of the text you are editing.**
  Touching the size field or slider blurred the editing surface, losing the
  caret and the highlight even though the change itself applied. Dragging the
  slider also left Ctrl+Z inert until you clicked back into the canvas.
- **Nudging a size slider by one step takes effect while you hold it.** One step
  moves the thumb about 2 px, short of the 3 px it took to be read as a drag, so
  a font size or a line width stayed as it was until you released the button.
- **The text editor no longer grows a scrollbar when sizes are mixed.** A newline
  that ends a line was measured at the shape's size rather than at the size of
  the run it opens, so a box could come up a whole line short of its own text.
- **An empty line keeps the size of the line it was opened from**, instead of
  collapsing to the shape's default — 36 px short on a 40 px line.
- **Shapes no longer shudder while the canvas auto-scrolls at an edge.** A
  dropped frame let the viewport advance twice while the dragged shape was still
  positioned against the old one, so it lagged and snapped back by 10–20 px.
- **The view no longer leaps after you rest at an edge and move again.** The
  self-driven scroll ticks were being recorded as pointer movement, so forty
  frames of resting piled up momentum that all ran in one frame.
- **Straight connectors no longer collect `"points": []` on every save.** The
  empty array made the document compare as changed, which cost you a redundant
  external sync — dropping any gesture in progress and adding a history entry —
  besides the noise in the file.
- **Exported text no longer overflows the width it was given.** Lines now pin
  their own advance width in the exported SVG.
- **A shape can no longer vanish after a reload** because the search for a height
  that fits its text stepped over the band that would have worked.
- **Changing a callout's tail re-measures its text region.** Re-derivation only
  watched the fields the built-in types read, so a change to a type's own field
  left what you saw and what was saved disagreeing.
- **Undo and redo no longer move the camera.** A document coming back through
  history looked new enough to re-apply its `view`, overwriting the position the
  history had preserved.
- **A shape that omits `strokeWidth` is drawn at the documented default of 2.**
  The schema and the reference both say 2, but drawing fell back to 1 — and a
  `lucideIcon` to no stroke at all, so it came out invisible. Shapes created in
  the editor always write the value out, so this only showed on documents
  written by hand or by an AI.
- **The Bold toggle reflects a `fontWeight` of `"700"`.** Only the literal string
  `"bold"` counted, so a document that spells the weight numerically drew bold
  while the toggle showed off. 500 and 600 are not counted as bold.
- **A `polygon` or `polyline` without a `stroke` follows the theme's ink colour**
  instead of being drawn literally black — invisible against a dark theme.
- **A `record` no longer loses a compartment's text.** Slot names that look like
  numbers but are not real array indices (`1.5`, `Infinity`, `4294967295`) were
  being deleted along with their content.
- **Two shapes made from the same stencil no longer share their nested values**,
  where editing one rewrote the other.
- **A document that is actually broken now says so instead of loading quietly.**
  A connector missing its `source` or `target`, a non-boolean
  `lockAspectRatio`, a background that is not a colour, a non-finite number, and
  an out-of-range `textLayout` arriving through a paste all used to pass the
  reader; the last two could be saved and only rejected the next time the file
  was opened.

### Performance

- Deriving an auto height lays the text out once rather than per probe, and reads
  a shape's bounds from a memo.
- Values that were being rebuilt every render — and so defeating the memoization
  meant to prevent re-renders — are stable again, on the text editing path in
  particular.

## [0.8.0] - 2026-08-16

Text is no longer one style per shape: any stretch of it can be bold, italic,
underlined, struck through, coloured or resized on its own, and it is edited on a
surface that draws what it will look like. A frameless `text` shape joins the
library, `.jis` and `.jiscribe` open from the OS shell, and the extension is now
MIT licensed.

### Added

#### Text

- **Style a stretch of text, not just the whole shape.** Select part of a label
  and apply bold / italic / underline / strikethrough, a colour or a size to just
  those characters. **Ctrl/Cmd+B / I / U** toggle the selection while editing, and
  the object menu's text items apply to the selection when there is one and to the
  whole slot when there is not. A property set on the whole slot clears the same
  property from the runs that overrode it, so the change is always visible.
  Per-range styling survives copy / paste, undo / redo, saving, and PNG / SVG
  export, and it works inside a `record`'s compartments row by row.
  A document with no styled range is saved byte-for-byte as before — the plain
  string stays the canonical form.
- **Text is edited on a surface that draws its real styling.** The editor used to
  be a transparent textarea laying the text out in one uniform font, so the caret,
  the selection and the line wrapping sat where the _unstyled_ text would be. It
  now draws the styled text itself, and the box grows around a part drawn larger.
- **Text format buttons sit directly in the object menu** while text has the
  focus (a slot is selected or text is being edited), instead of behind the
  text-format dropdown. With only a shape selected, the dropdown is unchanged.
- **`text`: a shape that is only text.** No frame, no fill, no wrapping — the box
  is derived from the content and grows right and down from the point you place
  it, with line breaks written explicitly. It sits next to Polygon in the toolbar,
  takes rotation, snapping and marquee selection like any other shape, and only
  the resize handles are hidden. Clicks pass through the empty side of a line, so
  a shape underneath stays reachable.

#### Shapes

- **UML Package and UML Component**, in the UML flyout: a tabbed rectangle whose
  name sits in the body, and a rectangle carrying the UML 2 component icon at the
  top right. The shape set is now 50 drawable types.

#### Files

- **`.jis` and `.jiscribe` open in the canvas editor.** OS file association
  resolves only the last dot segment, so a `.jis.json` file could not be opened
  from the shell. Both single-segment extensions are now first-class — they open
  in the canvas editor, are highlighted and schema-validated as JSON, and new
  canvases default to `untitled.jis`. `.jis.json` / `.jiscribe.json` keep working
  unchanged, and the AI adapters written by **Set up AI** cover the new
  extensions.

#### Canvas

- **Panning with the middle or right button carries momentum.** Release while
  moving and the view glides to a stop; release at rest and it stops where it is,
  as before. A new press or a wheel tick cancels the glide immediately. The object
  menu hides for the duration instead of flying across the screen with the
  selection.

### Changed

- **The extension is now MIT licensed** (it shipped under a custom EULA before),
  and the engine behind it is developed in the open at
  [github.com/gznnk/jiscribe](https://github.com/gznnk/jiscribe).
- **Scheme-less URLs are no longer auto-linked in Markdown shapes.** The Markdown
  renderer moved to markdown-it 15, which drops fuzzy link detection: `example.com`
  and `www.example.com` now render as plain text. URLs with a scheme
  (`https://example.com`) and e-mail addresses are unaffected.
- **The bundled AI authoring assets teach per-range styling** and cover the two
  new UML shapes and `text`. The JSON schema also shrank from 164 KB to 104 KB by
  sharing one definition across the 30 box-shaped types, with no change to what it
  accepts. If you use AI authoring, re-run the **Set up AI** command to refresh the
  assets under `.jiscribe/`.

### Fixed

- **Editing one `record` no longer edits every other one.** Shapes were created by
  a shallow copy of their type's defaults, so all records made from the same
  defaults shared the very same text slots — typing into one changed the text and
  typography of the rest.
- **Right-clicking a shape you just left-clicked opens the context menu.** The two
  presses within 300 ms and 5 px were read as one double-click, which the context
  menu does not respond to, so it silently failed to open.
- **Saved files keep clean numbers.** Rounding was applied in the gesture and
  command layers, so shapes whose geometry is derived (`x = cx - width / 2`) still
  wrote values like `83.43334999999999`. Rounding now happens once, where state
  becomes document.
- **Editing a `record` no longer fattens the file.** Its compartments materialized
  six typography fields each on the first save; omitted styling now stays omitted
  and is resolved at draw time instead.
- **A hand-authored or AI-generated document renders with its type's own text
  defaults.** A field left out fell back to a shared centre / middle / 16 px, so a
  bare `text` object drew centred although its type declares left-aligned.
- **Labels hung below a shape no longer wrap early.** They were measured at 14 px
  and drawn at 16 px, so the box came up short of its own text whenever the
  document did not spell out a font size.
- **Long connector, below-shape and group labels no longer wrap at an arbitrary
  width cap**, and a styled label is measured under its real fonts (it used to be
  measured as the literal text `[object Object]`).
- **The object menu stays under your pointer while you use it.** Changing a font
  size or weight re-measures the box, which moved the menu anchored to its bottom
  edge out from under the pointer mid-drag. It also follows the box as it grows
  while you type, instead of anchoring to the pre-edit size.
- **Dragging a size slider over selected text no longer floods undo.** Every
  preview frame was pushing a history entry, so returning to the original size took
  many presses of undo.
- **Keyboard shortcuts no longer steal keystrokes aimed at the text being edited**,
  and the shortcut help (`?`) opens only for the focused canvas instead of once per
  open canvas.
- **Spell-check red squiggles are gone from text editing**, where identifiers and
  abbreviations common in diagrams were being underlined.
- **A shape being dragged no longer teleports when the drag is cancelled.** The
  browser reports the cancel at client (0, 0), which was taken as the pointer's
  position — visible mainly on touch, where a drag taken over as a page scroll
  always ends this way.
- **The UML stencil icons are legible at toolbar size** (their frame was 2 px
  shorter than every other plugin's, leaving 3 px per band).

### Performance

- **Dragging no longer walks every object each frame.** The content re-measure pass
  ran over the whole object map on every pointer move; it now visits only the ids
  that could have changed. At 2000 objects that is 1.56 ms → 0.0005 ms per frame,
  about 9% of a 60 fps budget returned. Duplicating the object record is ~2.8×
  faster (5000 objects: 6.60 ms → 2.35 ms).
- Text measurement sets the canvas font only when it actually changes, and
  unwrapped heights are computed without touching the measuring canvas at all.

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
