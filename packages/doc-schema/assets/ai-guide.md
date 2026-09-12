<!-- jiscribe guide 0.10.0+775aeeec -->

# Jiscribe AI Authoring Guide

A practical guide for an AI to correctly generate and edit Jiscribe `.jis` (also `.jiscribe`; the legacy `.jis.json` / `.jiscribe.json` are still read) diagram data.
It focuses on the essentials. The field-level specification lives in the JSON Schema beside it, [`jiscribe.schema.json`](./jiscribe.schema.json): look up a type's `$def` there for its exact properties, defaults and constraints.

## The canvas

- The canvas is an **infinite plane**. Coordinates follow the SVG convention: **x increases to the right, y increases downward** (the opposite of math; screen coordinates). Unit is **px**.
- Coordinate values are arbitrary (**negatives are allowed**). The origin `(0, 0)` is **not** pinned to the top-left of the screen (the view pans and zooms).
- Objects have a **stacking order** (z-order): one is drawn on top of another, and overlapping is allowed.
- There is no auto-layout. You compute coordinates yourself (see "Layout").

## Colors, lines, fill and text

- Colors (`stroke` / `fontColor` / `fill`): a CSS color string, or `"auto"` to follow the editor theme. `"auto"` is the default for `stroke` / `fontColor` (resolved to the theme foreground) and adapts to light/dark; `fill` defaults to `"transparent"`. Prefer `"auto"` (or omit the field) unless a specific color is needed.
- Stroke: `stroke` (color, default `"auto"`), `strokeWidth` (default 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`, `strokeOpacity` (0–1, default 1)
- Fill: `fill` (default `"transparent"`), `fillOpacity` (0–1, default 1)
- Text (every box shape, and `text`): `text`, `textAlign`: `"left"`/`"center"`/`"right"`, `verticalAlign`: `"top"`/`"middle"`/`"bottom"`, `fontColor` (default `"auto"`), `fontSize` (default 16). Where inside a shape the text lands differs by type — see "Where text is drawn".

## Arrows and relationship notation

- Arrows `startArrow`/`endArrow`: `"None"` / `"FilledTriangle"` (standard arrow) / `"OpenArrow"` / `"HollowTriangle"` / `"FilledDiamond"` / `"HollowDiamond"` / `"ConcaveTriangle"` / `"Circle"` / `"HollowCircle"` / `"Cross"`
- UML relationships combine an arrow with `strokeDashType`: generalization = `"HollowTriangle"` + solid, realization = `"HollowTriangle"` + `"dashed"`, dependency = `"OpenArrow"` + `"dashed"`, association = `"OpenArrow"` + solid, aggregation = `"HollowDiamond"`, composition = `"FilledDiamond"`, non-navigable end = `"Cross"`
- Two further UML ends are circles rather than heads: `"Circle"` (filled) is an owned association end, and is also the endpoint of a lost / found message in a sequence diagram; `"HollowCircle"` (unfilled) is a provided interface — the lollipop
- `"ConcaveTriangle"` is a filled triangle with a notch cut into the middle of its base (a swallowtail). It belongs to no notation — reach for it only when a plain arrow needs a silhouette of its own
- ER cardinality (crow's foot notation) goes on the end nearest the entity it describes: `"CrowFootMany"` (many) / `"CrowFootOneMany"` (`1..*`) / `"CrowFootZeroMany"` (`0..*`) / `"CrowFootOne"` (`1..1`) / `"CrowFootZeroOne"` (`0..1`). A one-to-many relationship therefore sets **both** ends, e.g. `"startArrow": "CrowFootOne"` with `"endArrow": "CrowFootZeroMany"`

## Styling part of a text

A shape's typography (`fontSize`, `fontColor`, `fontWeight`, …) applies to its
whole text. To draw **part** of it differently — one bold word, one phrase in red
— that `text` becomes a list of runs instead of a single body: each run is
`{ "text": "..." }` plus the fields it overrides, and the runs are concatenated in
order to form the text.

- A run is
  `TextRun = { "text": "...", fontColor?, fontSize?, fontFamily?, fontWeight?, fontStyle?, textDecoration? }`
  — the characters plus any of those six typography fields.
  `textAlign` / `verticalAlign` place the whole text, so they stay on the shape
  (or on the record slot) and are not run fields.
- The runs' `text` values, concatenated in order, **are** the body's characters.
  There are no offsets or lengths to compute: cut the string where the styling
  changes and write the pieces out in order.
- A run carries only the difference: every field it leaves unset is drawn with
  the shape's (or the slot's) own typography.
- Use a plain text unless part of it has to be drawn differently. A text drawn in
  one style is a plain string — that is the form every reader expects, and runs
  are noise on it.
- Non-canonical runs are normalized on write: a run list in which nothing is
  styled collapses back to a plain string, adjacent runs drawn alike merge, and
  empty runs drop. Prefer writing clean runs, but the file is not rejected for
  them.
- The same applies inside a `record`: a band's text and each row of a compartment
  take either form.

## Three shapes that carry structured content

### `record` — a titled box with compartments

Use `record` for a **titled box with compartments of rows**: a UML class, an ER
entity, an ontology concept with its properties. Its text is not one body but a
set of named slots: the title goes in the `name` slot, and a compartment holds
**one entry per row** (never a newline inside an entry).

**Which slots you write is what gives the box its compartments.** There are four:
`stereotype`, `name` (always drawn), `attributes`, and `operations`, stacked in
that order. Leave a slot out entirely and the box does not have it. `stereotype`
is an optional thin band above the title — write it for an interface, an abstract
class, or an enum (`<<interface>>`); no divider separates it from `name`, so the
two read as one header. A UML class adds the `operations` slot; a DTO, an ER
entity, or a value object leaves it out and stays two-compartment.

An empty row list is not the same as an absent slot: an empty `operations`
compartment is still drawn, which is how you say "this class has no operations"
rather than "this box has no operations compartment".

`name` and `stereotype` are each **one body** of text, never a list of rows and
never empty as a list (an empty title is `""`).

Each slot carries **its own** typography (`textAlign` / `verticalAlign` /
`fontColor` / `fontSize` / `fontFamily` / `fontWeight` / `fontStyle` /
`textDecoration`, all optional); a `record` has **no shape-wide** text fields.
Slot defaults follow what the slot is for — the `stereotype` and `name` bands are
centered (and `name` is bold), the row compartments are `textAlign` `"left"` /
`verticalAlign` `"top"`, and every slot is `fontSize` `14` (the 21px row pitch is
sized for it) — and `fill` defaults to `"auto"` like `markdown`. Every band draws
exactly what its slot's typography says; rows are packed one line per entry.

The **height is never adjusted to the content** — the compartments divide up
whatever height you give. Each compartment above the bottom one takes the height
its own rows need (`21 * rows + 4`, and 25 when empty); the bottom one takes the
remainder and clips anything past the box. So size it yourself:

- title + one compartment of N rows: `32 + 21 * N`
- add a second compartment of M rows: `+ 21 * M + 4`
- add a `stereotype` band: `+ 28`

The **header bands** are the parts that grow with their text: a larger
`fontSize`, a newline, or a string too long for the width makes the band taller
(one 1.5×fontSize line per displayed line plus 7px) and pushes the compartments
down, so add that much to the height too.

### `markdown` — a rendered document card

Its text holds **Markdown source** and is rendered as HTML — headings, lists,
tables, code fences, links, and math (`$...$` inline, `$$...$$` block). Every
other shape draws text as plain text, so reach for `markdown` whenever the
content needs structure (notes, specs, summaries), and keep `rect` for one-line
labels. Defaults suit a document: 300x200, `textAlign` `"left"`, `verticalAlign`
`"top"`, `fill` `"auto"`. Content taller than the height is clipped, so leave
headroom. Image export flattens it to plain text.

### `svg` — the escape hatch for complex visuals

Use `svg` **only** when the built-in shapes (rect / ellipse / polyline / polygon)
genuinely cannot express what you need — e.g. icons, logos, gradients, or
ready-made technical figures. Prefer the built-in shapes for ordinary boxes,
nodes, and arrows; they stay editable, themeable, and connectable.

- It is an **opaque box**: its position and size define where and how big it is
  drawn, and the SVG content is scaled to fit that box.
- The markup must be **self-contained**: no `<script>`, no event handlers
  (`on*`), and no external references (`href`/`xlink:href` to URLs). These are
  stripped at render time, so anything relying on them will not show. Inline
  `<defs>` / gradients / `<path>` are fine.
- `svg` has **no** text / stroke / fill / `rx` of its own (style lives inside the
  markup).
- When you place **multiple** `svg` objects, give every internal `id` (gradients,
  filters, clip paths, etc.) a **document-unique** name (e.g. `grad-logo1`, not
  `grad`). All markup shares one DOM, so duplicate ids make `url(#id)` references
  resolve to the wrong (first) definition.

## Three things the canvas genuinely does not have

Take the substitute and say so plainly, rather than building an imitation out of
many shapes:

- **No gradients**: use a flat fill, and a border or a second lighter fill where you want depth.
- **No shadows**: separate a card from its background with a border or a fill, not a fake blurred layer.
- **No arcs**: an ellipse is always a whole ellipse, so show a ratio as a bar or a number rather than a ring.

Semi-transparency is not among them, and it is a **property** as well as a
color: `fillOpacity` / `strokeOpacity`, 0 (invisible) to 1 (opaque, the default),
each multiplying the alpha its own color already carries. Use the property when
the color is a shared token that should stay opaque and reusable, and write the
alpha into the color (`rgba(37, 99, 235, 0.15)`, `#2563EB26`) when the
transparency belongs to that color itself. A connector's `label` takes neither
opacity field. When a fill hides a gridline or a shape behind it, restyle the
fill instead of removing what it covers.

## Object quick reference

What each `type` is for. Pick the type that already means what you are drawing
rather than a `rect` with a label on it.

<!-- AUTOGEN:BEGIN object-quick-reference -->

| `type`                  | Use                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `rect`                  | general-purpose node / label box                           |
| `markdown`              | Markdown-rendered document card                            |
| `ellipse`               | ellipse / oval node (center-based geometry)                |
| `text`                  | bare text label / annotation                               |
| `diamond`               | decision / branch node                                     |
| `stadium`               | start / end terminator                                     |
| `parallelogram`         | input / output                                             |
| `hexagon`               | preparation                                                |
| `cloud`                 | external system, fuzzy concept                             |
| `document`              | report, file                                               |
| `multiDocument`         | report batch / file set                                    |
| `actor`                 | user, role, stakeholder                                    |
| `browserWindow`         | web UI node (a symbol, not a frame to lay a screen out in) |
| `terminalWindow`        | CLI, shell session                                         |
| `smartphone`            | mobile client                                              |
| `laptop`                | desktop client, web client                                 |
| `server`                | host, node, running process                                |
| `gear`                  | service, batch job, daemon                                 |
| `package`               | library, artifact, deployment unit                         |
| `folder`                | directory, grouping                                        |
| `file`                  | source file, configuration                                 |
| `envelope`              | message, event                                             |
| `queue`                 | job queue, message queue                                   |
| `lock`                  | authentication, protected resource                         |
| `shield`                | security boundary, trust zone                              |
| `lucideIcon`            | decorative Lucide icon (no text, not connectable)          |
| `callout`               | annotation bubble                                          |
| `note`                  | comment box, UML note                                      |
| `brace`                 | group marker, grouping annotation                          |
| `bracketWithStem`       | group marker with a pointer, grouping annotation           |
| `bracket`               | group marker, grouping annotation                          |
| `db`                    | data store                                                 |
| `storedData`            | generic stored data (file / cache)                         |
| `subroutine`            | predefined process / call                                  |
| `trapezoid`             | manual operation                                           |
| `manualInput`           | manual / keyed input                                       |
| `card`                  | punched-card style data                                    |
| `delay`                 | wait / delay                                               |
| `loopLimit`             | loop start (`"flipY": true` for the end)                   |
| `display`               | output to a display                                        |
| `extract`               | extract / merge marker                                     |
| `cross`                 | junction / emphasis marker                                 |
| `offPageConnector`      | off-page connector (jump to another page)                  |
| `record`                | titled box + row compartments (UML class / ER entity)      |
| `umlPackage`            | namespace, module, layer                                   |
| `umlComponent`          | component, replaceable part                                |
| `awsIcon`               | AWS service / resource icon (a labelled, connectable node) |
| `awsGroup`              | AWS boundary frame (VPC, subnet, region, account)          |
| `polyline`              | open line                                                  |
| `polygon`               | closed shape from points                                   |
| `group`                 | container of child objects                                 |
| `container`             | titled region (module, subsystem, boundary)                |
| `sticky`                | sticky note (no stroke or `rx`)                            |
| `svg`                   | raw SVG escape hatch (opaque box)                          |
| `connector` (in `root`) | edge / arrow between objects                               |

<!-- AUTOGEN:END object-quick-reference -->

## Pictograms are symbols, not frames

`browserWindow` / `terminalWindow` / `smartphone` / `laptop` / `server` / `gear` /
`package` / `folder` / `file` / `envelope` / `queue` / `lock` / `shield` are
**pictograms**: symbols that stand for a thing in a diagram. Every detail they
draw — a title bar, a screen, teeth, a lid — is a fraction of the bounding box,
so they read at around their default size (roughly 100–160px) and distort when
blown up: a browser window scaled to a real screen becomes a giant title bar with
giant buttons. Give one a label and connect it to its neighbours; do not lay
content out inside it. **A screen mockup is `rect` for each region** (or
`container` for a titled one), with the pictogram left to mean "this is the web
UI".

## Where text is drawn

Every box shape draws its text somewhere inside its own box, but not always in
the middle of it, and for some types not inside it at all. Size the shape for
where its text actually goes.

- For `diamond` and `stadium`, text is placed within the full bounding box (not clipped to the shape interior).
- For `db`, text is placed in the body region below the top cap ellipse.
- For `cloud`, text is placed in a reduced central region inside the bumps, so give the shape generous width/height.
- For `document` and `callout`, text sits above the bottom wave/tail band.
- For `multiDocument`, text is confined to the front (bottom-left) sheet, so give the shape generous size.
- For `actor`, `server`, `package`, `envelope`, `queue`, `gear`, `lock`, `extract` and `cross`, the drawing fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and omitting the text leaves a bare figure.
- **`record` is the exception**: its text is a set of named slots, and the typography lives inside each slot rather than on the shape (see "`record` — a titled box with compartments").

## Layout

These are guidelines for readability, not part of the spec. Overlapping itself is
allowed (see "The canvas"); what these avoid is the overlap nobody meant.

- Standard node: `width: 160`, `height: 80`.
- Spacing between nodes: horizontal **80–120px**, vertical **60–100px**. Lay the shapes out on a grid with gaps that generous so connectors stay readable.
- Keep a single flow direction (left→right or top→bottom).
- Choose connect points to match the connection direction (for left→right, source = `rightCenter`, target = `leftCenter`).
- Do not overlap objects that are already there.

## Choosing what to draw with

- Prefer flowchart types (`diamond` for decisions, `stadium` for start/end, `rect` for steps) when the user asks for a flowchart. The same goes for the other families: pick the type whose meaning is already the thing you are drawing (see "Object quick reference").
- For directed flows set `endArrow` to `FilledTriangle`.
- When shapes form one cluster (a subsystem, a lane, a legend), group them as you build rather than afterwards, and put later additions into the same group.
- Color as you go, by giving `fill` / `stroke` / `fontColor` when you add a shape, rather than adding everything first and restyling afterwards.
- Do not reach for `svg` for ordinary boxes, nodes and arrows — use the built-in shapes and keep `svg` for visuals they cannot express (see "`svg` — the escape hatch for complex visuals").

## Know what is already there

Read the canvas before you edit it, and again after several edits to confirm the
result. On a drawing you did not build yourself, read what is already there
before you place anything: a shape you failed to account for is the usual cause
of an overlap nobody meant.

Add the nodes first, then draw the connectors between them.

## Fix your own work instead of working around it

Everything you draw stays editable:

- **Wrong shape, wrong label, wrong color**: delete or restyle the object itself. Never leave a mistake standing and put a second object beside it.
- **A line that crosses a shape**: fix the connector — pin both ends to the edges that face each other, or give the corners as route points. Do not redraw the diagram to dodge it.
- **A layout that got tight**: move shapes to open space up, align and distribute to tidy rows and columns, resize a shape when a label no longer fits.
- **Text on a line belongs to the line**: it is the connector's own label. Never place a text shape next to a connector to fake a label.
- **A free path** — a chart line, a bracket, a detour around a shape — is one connector: `routing` `"straight"` plus every corner in `points`, as many as it takes. Never put an invisible shape at each bend, and never stack narrow rectangles to fake a line or a filled area.
- **A line that hangs on nothing** is a `polyline` instead: a connector keeps at least one end on an object, and the other may stand at a free coordinate.
- **Something buried under a fill**: change the stacking order, since creation order is drawing order. Send the fill to the back or bring what it covers to the front, rather than redrawing in another order.
- **A shape pointing the wrong way**: rotate it (clockwise degrees about its own center). Poly shapes do not turn — give them turned points instead.

## Check the drawing before you answer

Check with numbers rather than by eye: look for shapes sitting on one another,
measure a label that may not fit its shape, measure a line you suspect cuts
through one. These answer exactly; a picture only suggests.

Then look at what you drew, for what no measurement catches — a lopsided layout,
a cluster that reads wrong. Fix what you found, then answer.

## Answering

Answer the user briefly in the language they wrote in. Describe what you drew
rather than dumping JSON; they can see the canvas.

## Writing the document by hand

What follows is the file format itself — the fields a `.jis` document holds and
how they fit together — for writing one directly in an editor rather than
through the canvas tools. (Also `.jiscribe`; the legacy `.jis.json` /
`.jiscribe.json` are still read.)

### Minimal structure

The top level must always have `version` / `root` (the array may be empty).

```json
{
	"version": 1,
	"root": []
}
```

- `version`: **required, always `1`** (fixed value for this format version).
- `root`: array of shapes (every `type` in "Object quick reference") **and connectors**, in z-order (back → front). The array order is the stacking order — later entries are drawn on top. Connectors (`"type": "connector"`) sit at the top level among the objects; they are **never** placed inside a group's `children`.
- `background`: **optional** canvas surface color, a literal CSS color string (e.g. `"#f5f5f5"` — a concrete color, not a `var(...)`). Omit it to follow the theme background; set it and it becomes the surface for both display and image export, with the grid line color derived from it.
- `view`: **optional** display declaration — `"view": { "padding": { "top": 48, "right": 64, "bottom": 64, "left": 64 }, "open": "fit-width", "scroll": "content" }`. `padding` is the empty space (world px) kept outside the content on each side; each side is optional and defaults to 0. It is the margin of rendered/exported images and the box the initial view is fitted to, so **declare the margin here rather than baking it into object coordinates** (do not offset every shape to fake a page margin). `open` says how to frame the view when the document is opened: `"fit-width"` fits the padded width and starts at the top (a document read top to bottom), `"fit-all"` fits the whole padded drawing and centers it (a diagram taken in at a glance). `scroll` says whether the document is a bounded page or an endless board: `"content"` walls panning in at that same padded box (so an article opened `"fit-width"` cannot be panned sideways off its own page), `"infinite"` — and omitting the field — leaves the board endless. None of the three constrains editing — objects may still be placed outside the padding — and a host that sets its own camera or scroll limit overrides `open` / `scroll`. Omit `view` entirely and nothing changes from before.

## MUST / MUST NOT (violations break the file)

**MUST**

- Include **`version: 1`** at the top level (required, fixed value).
- Give every object a **unique `id`** and a **`type`**.
- `rect` and every other box shape use `x`,`y` (top-left) + `width`,`height`. Two types differ: `ellipse` takes `cx`,`cy` (center) + `rx`,`ry` (radii), and `text` takes `x`,`y` alone.
- Put `connector` in `root` (top level, mixed with the objects), and express its endpoints with `source` / `target` (EndpointRef).
- A connector must have **at least one owned endpoint** (`source` or `target` referencing an object). Both endpoints `free` is invalid.
- Leave `points` as an **empty array** `[]` unless a specific route matters. Empty lets the engine route the whole path, which is almost always what you want.
- Optional `routing`: the **shape of the segments**. Omitted ⇒ `"orthogonal"` (default) — right angles only. `"straight"` draws the segments at any angle. For flowchart-style wiring, just omit `routing`.
- Non-empty `points` are the route's **vertices** — the corners the line bends at, in order. They become the whole path, so under `"orthogonal"` **consecutive points must share x or y** (and so must the first/last point with its endpoint's axis); the engine no longer avoids anything.
- A connector may **loop back to the same object** (`source` and `target` referencing the same `owner.id`) — useful for self-transitions in state machines. Point the two endpoints at different anchors (e.g. `topCenter` and `rightCenter`); with `points` `[]` it is drawn as a rectangular loop whatever `routing` says, so leave `routing` omitted.

**MUST NOT**

- Do not put endpoint (start/end) coordinates in a connector's `points`. `points` holds only the intermediate vertices (usually empty).
- Do not attach a connector endpoint (`owner`) to a `lucideIcon`, `polyline`, `polygon`, `group`, `svg`, or `connector`. Every other box shape is connectable, and so is `text`; for those six non-connectable types, use a `free` endpoint to point near them.
- Do not give a `group` `x`,`y`,`width`,`height`. Its position comes from its `children`.
- Do not give a `text` a `height` — its height is always measured from the text itself. `width` belongs to its `textLayout: "block"` form alone, where it is required and is the width the text wraps in; the default label form measures its width too, and `fontSize` is what makes it bigger.
- Do not reuse the same `id`.
- Do not put a `connector` inside a group's `children` (connectors live at the top level of `root` only).

## Geometry by type

Each shape has its own reference point: **every box shape except `ellipse` uses
its top-left corner `(x, y)`**, **`ellipse` uses its center `(cx, cy)`**. "Box
shape" here and below means every object type except `text` / `polyline` /
`polygon` / `group` / `svg` / `connector`. `text` also anchors at its top-left
`(x, y)`, but it is not a box shape: it never stores a `height`, and stores a
`width` only in its `textLayout: "block"` form.

<!-- AUTOGEN:BEGIN object-geometry -->

| `type`                  | Required geometry                                              |
| ----------------------- | -------------------------------------------------------------- |
| `rect`                  | `x`,`y`,`width`,`height`                                       |
| `markdown`              | `x`,`y`,`width`,`height`                                       |
| `ellipse`               | `cx`,`cy`,`rx`,`ry`                                            |
| `text`                  | `x`,`y` (no `height`; `width` only with `textLayout: "block"`) |
| `diamond`               | `x`,`y`,`width`,`height`                                       |
| `stadium`               | `x`,`y`,`width`,`height`                                       |
| `parallelogram`         | `x`,`y`,`width`,`height`                                       |
| `hexagon`               | `x`,`y`,`width`,`height`                                       |
| `cloud`                 | `x`,`y`,`width`,`height`                                       |
| `document`              | `x`,`y`,`width`,`height`                                       |
| `multiDocument`         | `x`,`y`,`width`,`height`                                       |
| `actor`                 | `x`,`y`,`width`,`height`                                       |
| `browserWindow`         | `x`,`y`,`width`,`height`                                       |
| `terminalWindow`        | `x`,`y`,`width`,`height`                                       |
| `smartphone`            | `x`,`y`,`width`,`height`                                       |
| `laptop`                | `x`,`y`,`width`,`height`                                       |
| `server`                | `x`,`y`,`width`,`height`                                       |
| `gear`                  | `x`,`y`,`width`,`height`                                       |
| `package`               | `x`,`y`,`width`,`height`                                       |
| `folder`                | `x`,`y`,`width`,`height`                                       |
| `file`                  | `x`,`y`,`width`,`height`                                       |
| `envelope`              | `x`,`y`,`width`,`height`                                       |
| `queue`                 | `x`,`y`,`width`,`height`                                       |
| `lock`                  | `x`,`y`,`width`,`height`                                       |
| `shield`                | `x`,`y`,`width`,`height`                                       |
| `lucideIcon`            | `x`,`y`,`width`,`height`                                       |
| `callout`               | `x`,`y`,`width`,`height`                                       |
| `note`                  | `x`,`y`,`width`,`height`                                       |
| `brace`                 | `x`,`y`,`width`,`height`                                       |
| `bracketWithStem`       | `x`,`y`,`width`,`height`                                       |
| `bracket`               | `x`,`y`,`width`,`height`                                       |
| `db`                    | `x`,`y`,`width`,`height`                                       |
| `storedData`            | `x`,`y`,`width`,`height`                                       |
| `subroutine`            | `x`,`y`,`width`,`height`                                       |
| `trapezoid`             | `x`,`y`,`width`,`height`                                       |
| `manualInput`           | `x`,`y`,`width`,`height`                                       |
| `card`                  | `x`,`y`,`width`,`height`                                       |
| `delay`                 | `x`,`y`,`width`,`height`                                       |
| `loopLimit`             | `x`,`y`,`width`,`height`                                       |
| `display`               | `x`,`y`,`width`,`height`                                       |
| `extract`               | `x`,`y`,`width`,`height`                                       |
| `cross`                 | `x`,`y`,`width`,`height`                                       |
| `offPageConnector`      | `x`,`y`,`width`,`height`                                       |
| `record`                | `x`,`y`,`width`,`height`                                       |
| `umlPackage`            | `x`,`y`,`width`,`height`                                       |
| `umlComponent`          | `x`,`y`,`width`,`height`                                       |
| `awsIcon`               | `x`,`y`,`width`,`height`                                       |
| `awsGroup`              | `x`,`y`,`width`,`height`                                       |
| `polyline`              | `points` (open line)                                           |
| `polygon`               | `points` (auto-closed)                                         |
| `group`                 | `children`                                                     |
| `container`             | `x`,`y`,`width`,`height`                                       |
| `sticky`                | `x`,`y`,`width`,`height`                                       |
| `svg`                   | `x`,`y`,`width`,`height` + `svgText`                           |
| `connector` (in `root`) | `source`,`target`,`points:[]`                                  |

<!-- AUTOGEN:END object-geometry -->

### Bare text (`text`)

A label with no box, outline or fill around it — titles, captions, free
annotations. It takes `x`,`y` (top-left of the text) plus the Text and Transform
fields; in its default label form **nothing else**: no `width` / `height`,
because the box is measured from the content and grows right and down as the text
gets longer, so `fontSize` (and `fontWeight`) is how you size it. Its
`textLayout: "block"` form instead stores a required `width` and wraps in it (for
body copy); the height stays measured in both forms. With `rotation` or a flip
set, "right and down" means the shape's own axes, so `x`,`y` stay put whatever
the text does. Since the box hugs the text, `textAlign` shows up only across the
lines of a multi-line `text`, and `verticalAlign` has nothing to move within. It
is **connectable**: its four edge midpoints sit on the measured box, so a
connector attached to it follows the text as it grows.

## Connector endpoints (EndpointRef)

```json
"source": {
  "owner": { "id": "node-a" },
  "anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

- `anchor.kind`: `"connectPoint"` (+ `id`) / `"center"` / `"edge"` (+ `side`, `t`) / `"free"` (+ `point`)
- `connectPoint` `id`: `"topCenter"`/`"rightCenter"`/`"bottomCenter"`/`"leftCenter"` (for the center, use `"kind": "center"` instead — it is not a `connectPoint` id). On `brace` / `bracket` / `bracketWithStem` also `"tip"`, the marker's cusp / spine middle / stem end — use it whenever a connector points at a group marker
- `edge`: a free position along one local edge, `{ "kind": "edge", "side": "top", "t": 0.25 }`. Only when a named anchor cannot express where the line has to land (several parallel lines into one edge); `t` runs left→right on top/bottom, top→bottom on left/right, and `0.5` is the edge midpoint — write that as a `connectPoint` instead
- `owner` may reference **any box shape except `lucideIcon`, and `text`** — that is, every type except `lucideIcon` / `polyline` / `polygon` / `group` / `svg` / `connector`. You **cannot** attach an endpoint to those six (`lucideIcon` is decoration, not a node: place it beside the shape it marks and connect to that shape). To point an arrow at/from one of them, use a `free` endpoint placed near it instead.
- A free point not attached to any object: `{ "anchor": { "kind": "free", "point": { "x": 400, "y": 200 } } }` (no `owner`)

### Connector label

A connector has **no** top-level `text`. Put the edge label (e.g. `"Yes"`/`"No"`)
in a nested `label` object: `"label": { "text": "Yes" }`. Optional fields:
`position` (0–1 along the path, default 0.5 = midpoint), `offset` (perpendicular
shift, default 0), `fontColor` (default `"auto"`), `fontFamily` (one of the four
shipped stacks; default sans), `fontSize` (default 16), `fontWeight`, plus
background/border — `fill` (default canvas background = masks the line;
`"transparent"` to show the line), `stroke` (border color), `strokeWidth` (border
width, default 0 = no border), `strokeDashType` (border line style:
`"solid"`/`"dashed"`/`"dotted"`). It takes **no** `fillOpacity` /
`strokeOpacity` — write the alpha into the label's own color. Plain text only;
the label is drawn horizontally at the midpoint by default. Omit `label` for no
label.

## Writing runs, records and raw SVG

### Runs

Write a `text` as an array of runs when part of it is drawn differently (see
"Styling part of a text"):

```json
{
	"id": "n1",
	"type": "rect",
	"x": 100,
	"y": 100,
	"width": 200,
	"height": 80,
	"text": [
		{ "text": "Payment " },
		{ "text": "failed", "fontColor": "#d32f2f", "fontWeight": "bold" }
	]
}
```

### `record` — the one shape whose `text` is an object

Its `text` is a set of named slots and a plain string is rejected — put the title
in `name.text` and **one array entry per row** in a compartment's `text` (the
slots themselves are described in "`record` — a titled box with compartments").

```json
{
	"id": "user",
	"type": "record",
	"x": 120,
	"y": 80,
	"width": 180,
	"height": 95,
	"text": {
		"name": { "text": "User" },
		"attributes": { "text": ["id: string", "name: string", "email: string"] }
	}
}
```

A UML class adds the `operations` slot; a two-compartment box leaves it out:

```json
{
	"id": "order",
	"type": "record",
	"x": 360,
	"y": 80,
	"width": 200,
	"height": 120,
	"text": {
		"name": { "text": "Order" },
		"attributes": { "text": ["id: string", "total: number"] },
		"operations": { "text": ["submit()", "cancel()"] }
	}
}
```

An empty array is not the same as an absent slot: `"operations": { "text": [] }`
keeps the compartment and draws it empty.

**A row is itself one body of text**, so plain rows and styled rows mix in the
one array. A styled row is **an array inside the array** — the row's runs, in
their own brackets:

```json
"attributes": {
  "text": [
    "id: string",
    [{ "text": "email: " }, { "text": "required", "fontWeight": "bold" }]
  ]
}
```

The classic mistake is putting a run object **directly** in the row list:
`"text": [{ "text": "email: string" }]` is not a compartment holding one styled
row — it reads as a single run-styled body, and a compartment rejects it
(`must be a string, or an array of runs to style parts of it`). Give the row's
runs their own array.

`name` and `stereotype` are the other way round: each is one body, a string or an
array of runs, never a list of rows and never `[]` (an empty title is `""`).
Writing rows there is rejected with `must be one body of text, not rows`.

Each slot's typography is written beside its `text`; a `record` has no
shape-wide text fields, so writing them at the top level is an error.

### `svg` — the escape hatch

`x`,`y` (top-left) + `width`,`height` define where and how big it is drawn, and
`svgText` holds the **inline SVG markup** (must start with `<svg ...>`). Include
a **`viewBox`** so the content scales correctly to the box; the intrinsic size is
read from it automatically (if the `viewBox` is missing, the markup's
`width`/`height`, or `100x100`, is used as a fallback). You do **not** specify the
intrinsic size separately. `svg` is **not connectable** — point connectors near it
with a `free` endpoint. The constraints on the markup itself are in "`svg` — the
escape hatch for complex visuals".

```json
{
	"id": "logo-1",
	"type": "svg",
	"x": 160,
	"y": 120,
	"width": 120,
	"height": 120,
	"svgText": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"45\" fill=\"#6d28d9\"/><path d=\"M50 22 L59 43 L82 43 L63 57 L70 78 L50 65 L30 78 L37 57 L18 43 L41 43 Z\" fill=\"#fff\"/></svg>"
}
```

## Worked examples

### Example A: horizontal flowchart (3 rects + arrows)

```json
{
	"version": 1,
	"root": [
		{
			"id": "start",
			"type": "rect",
			"x": 40,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#E3F2FD",
			"stroke": "#1565C0",
			"strokeWidth": 2,
			"text": "Start",
			"fontColor": "#1565C0"
		},
		{
			"id": "process",
			"type": "rect",
			"x": 280,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#F3E5F5",
			"fillOpacity": 0.6,
			"stroke": "#6A1B9A",
			"strokeWidth": 2,
			"text": "Process",
			"fontColor": "#6A1B9A"
		},
		{
			"id": "end",
			"type": "rect",
			"x": 520,
			"y": 120,
			"width": 160,
			"height": 80,
			"rx": 8,
			"fill": "#E8F5E9",
			"stroke": "#2E7D32",
			"strokeWidth": 2,
			"text": "Done",
			"fontColor": "#2E7D32"
		},
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "id": "start" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "leftCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		},
		{
			"id": "c2",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "id": "end" },
				"anchor": { "kind": "connectPoint", "id": "leftCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		}
	]
}
```

### Example B: vertical architecture (ellipse node + group)

```json
{
	"version": 1,
	"root": [
		{
			"id": "client",
			"type": "ellipse",
			"cx": 200,
			"cy": 80,
			"rx": 90,
			"ry": 45,
			"fill": "#FFF3E0",
			"stroke": "#E65100",
			"strokeWidth": 2,
			"text": "Client",
			"fontColor": "#E65100"
		},
		{
			"id": "backend",
			"type": "group",
			"children": [
				{
					"id": "api",
					"type": "rect",
					"x": 120,
					"y": 220,
					"width": 160,
					"height": 70,
					"rx": 6,
					"fill": "#E3F2FD",
					"stroke": "#1565C0",
					"strokeWidth": 2,
					"text": "API",
					"fontColor": "#1565C0"
				},
				{
					"id": "db",
					"type": "rect",
					"x": 120,
					"y": 330,
					"width": 160,
					"height": 70,
					"rx": 6,
					"fill": "#ECEFF1",
					"stroke": "#37474F",
					"strokeWidth": 2,
					"text": "DB",
					"fontColor": "#37474F"
				}
			]
		},
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "id": "client" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "id": "api" },
				"anchor": { "kind": "connectPoint", "id": "topCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		},
		{
			"id": "c2",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "id": "api" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "id": "db" },
				"anchor": { "kind": "connectPoint", "id": "topCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"endArrow": "FilledTriangle"
		}
	]
}
```

## Common mistakes

- ❌ Putting a connector inside a group's `children` → ✅ keep connectors at the top level of `root`.
- ❌ A connector with both endpoints `free` (no owner) → ✅ at least one endpoint must reference an object.
- ❌ Attaching a connector endpoint (`owner`) to a `lucideIcon`/`polyline`/`polygon`/`group`/`svg` → ✅ every other box shape and `text` are connectable; use a `free` endpoint placed near the target instead.
- ❌ Putting endpoint coordinates in a connector's `points` → ✅ `points: []`; endpoints go in `source`/`target`.
- ❌ Putting a connector's edge label in a top-level `text` field → ✅ use a nested `label`: `"label": { "text": "Yes" }`.
- ❌ Giving a `group` `x`/`y`/`width`/`height` → ✅ position it via the `children` coordinates.
- ❌ Using `x`/`y`/`width`/`height` on an `ellipse` → ✅ use `cx`/`cy`/`rx`/`ry`.
- ❌ Giving a `text` `width`/`height`, or drawing a caption as a `rect` with an invisible stroke and fill → ✅ use `text` with `x`/`y` only, and size it with `fontSize`.
- ❌ Writing a uniformly styled text as an array of runs → ✅ a plain string; runs are only for a stretch that has to be drawn differently.
- ❌ Putting a run object straight into a `record` compartment's row list (`"text": [{ "text": "..." }]`) → ✅ wrap that row's runs in their own array: `"text": [[{ "text": "..." }]]`.
- ❌ Duplicate `id`s → ✅ make them all unique.
