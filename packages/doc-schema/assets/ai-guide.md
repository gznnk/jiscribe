# Jiscribe AI Authoring Guide

A practical guide for an AI to correctly generate and edit Jiscribe `.jis` (also `.jiscribe`; the legacy `.jis.json` / `.jiscribe.json` are still read) diagram data.
It focuses on the essentials. For the full field-level specification, see [`reference.md`](./reference.md).

---

## 1. Coordinate system (read this first)

- The canvas is an **infinite plane**. Coordinates follow the SVG convention: **x increases to the right, y increases downward** (the opposite of math; screen coordinates). Unit is **px**.
- Coordinate values are arbitrary (**negatives are allowed**). The origin `(0, 0)` is **not** pinned to the top-left of the screen (the view pans and zooms).
- Each shape has its own reference point: **every box shape except `ellipse` uses its top-left corner `(x, y)`**, **`ellipse` uses its center `(cx, cy)`** (per-type geometry is in "Object quick reference"). "Box shape" here and below means every object type except `text` / `polyline` / `polygon` / `group` / `svg` / `connector`. `text` also anchors at its top-left `(x, y)`, but it is not a box shape: it has no `width` / `height` at all.
- Stacking order (z-order) follows the **order of the `root` array** — later entries are drawn on top. Overlapping is allowed.
- There is no auto-layout. You compute coordinates yourself (see "Layout conventions").

## 2. Minimal structure

The top level must always have `version` / `root` (the array may be empty).

```json
{
	"version": 1,
	"root": []
}
```

- `version`: **required, always `1`** (fixed value for this format version).
- `root`: array of shapes (every `type` in "Object quick reference") **and connectors**, in z-order (back → front). The array order is the stacking order. Connectors (`"type": "connector"`) sit at the top level among the objects; they are **never** placed inside a group's `children`.
- `background`: **optional** canvas surface color, a literal CSS color string (e.g. `"#f5f5f5"` — a concrete color, not a `var(...)`). Omit it to follow the theme background; set it and it becomes the surface for both display and image export, with the grid line color derived from it.
- `view`: **optional** display declaration — `"view": { "padding": { "top": 48, "right": 64, "bottom": 64, "left": 64 }, "open": "fit-width", "scroll": "content" }`. `padding` is the empty space (world px) kept outside the content on each side; each side is optional and defaults to 0. It is the margin of rendered/exported images and the box the initial view is fitted to, so **declare the margin here rather than baking it into object coordinates** (do not offset every shape to fake a page margin). `open` says how to frame the view when the document is opened: `"fit-width"` fits the padded width and starts at the top (a document read top to bottom), `"fit-all"` fits the whole padded drawing and centers it (a diagram taken in at a glance). `scroll` says whether the document is a bounded page or an endless board: `"content"` walls panning in at that same padded box (so an article opened `"fit-width"` cannot be panned sideways off its own page), `"infinite"` — and omitting the field — leaves the board endless. None of the three constrains editing — objects may still be placed outside the padding — and a host that sets its own camera or scroll limit overrides `open` / `scroll`. Omit `view` entirely and nothing changes from before.

## 3. MUST / MUST NOT (violations break the file)

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
- Do not attach a connector endpoint (`owner`) to a `polyline`, `polygon`, `group`, `svg`, or `connector`. Every box shape is connectable, and so is `text`; for those five non-connectable types, use a `free` endpoint to point near them.
- Do not give a `group` `x`,`y`,`width`,`height`. Its position comes from its `children`.
- Do not give a `text` `width`,`height` — it has no such fields. Its box is measured from the text itself; `fontSize` is what makes it bigger.
- Do not reuse the same `id`.
- Do not put a `connector` inside a group's `children` (connectors live at the top level of `root` only).

## 4. Object quick reference

<!-- AUTOGEN:BEGIN object-quick-reference -->

| `type`                  | Required geometry                    | Main styles                                      | Use                                                   |
| ----------------------- | ------------------------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| `rect`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / `rx` / rotation           | general-purpose node / label box                      |
| `markdown`              | `x`,`y`,`width`,`height`             | stroke / fill / text / `rx` / rotation           | Markdown-rendered document card                       |
| `ellipse`               | `cx`,`cy`,`rx`,`ry`                  | stroke / fill / text / rotation                  | ellipse / oval node (center-based geometry)           |
| `text`                  | `x`,`y` (no `width`/`height`)        | text / rotation                                  | bare text label / annotation                          |
| `diamond`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | decision / branch node                                |
| `stadium`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | start / end terminator                                |
| `parallelogram`         | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | input / output                                        |
| `hexagon`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | preparation                                           |
| `cloud`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | external system, fuzzy concept                        |
| `document`              | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | report, file                                          |
| `multiDocument`         | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | report batch / file set                               |
| `actor`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | user, role, stakeholder                               |
| `browserWindow`         | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | web UI, screen                                        |
| `terminalWindow`        | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | CLI, shell session                                    |
| `smartphone`            | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | mobile client                                         |
| `laptop`                | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | desktop client, web client                            |
| `server`                | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | host, node, running process                           |
| `gear`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | service, batch job, daemon                            |
| `package`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | library, artifact, deployment unit                    |
| `folder`                | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | directory, grouping                                   |
| `file`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | source file, configuration                            |
| `envelope`              | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | message, event                                        |
| `queue`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | job queue, message queue                              |
| `lock`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | authentication, protected resource                    |
| `shield`                | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | security boundary, trust zone                         |
| `lucideIcon`            | `x`,`y`,`width`,`height`             | stroke / rotation                                | decorative Lucide icon (no text, not connectable)     |
| `callout`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | annotation bubble                                     |
| `note`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | comment box, UML note                                 |
| `brace`                 | `x`,`y`,`width`,`height`             | stroke / text / rotation                         | group marker, grouping annotation                     |
| `bracketWithStem`       | `x`,`y`,`width`,`height`             | stroke / text / rotation                         | group marker with a pointer, grouping annotation      |
| `bracket`               | `x`,`y`,`width`,`height`             | stroke / text / rotation                         | group marker, grouping annotation                     |
| `db`                    | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | data store                                            |
| `storedData`            | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | generic stored data (file / cache)                    |
| `subroutine`            | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | predefined process / call                             |
| `trapezoid`             | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | manual operation                                      |
| `manualInput`           | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | manual / keyed input                                  |
| `card`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | punched-card style data                               |
| `delay`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | wait / delay                                          |
| `loopLimit`             | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | loop start (`"flipY": true` for the end)              |
| `display`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | output to a display                                   |
| `extract`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | extract / merge marker                                |
| `cross`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | junction / emphasis marker                            |
| `offPageConnector`      | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | off-page connector (jump to another page)             |
| `record`                | `x`,`y`,`width`,`height`             | stroke / fill / **keyed** text / rotation        | titled box + row compartments (UML class / ER entity) |
| `umlPackage`            | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | namespace, module, layer                              |
| `umlComponent`          | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | component, replaceable part                           |
| `polyline`              | `points` (open line)                 | stroke / startArrow / endArrow                   | open line                                             |
| `polygon`               | `points` (auto-closed)               | stroke / fill                                    | closed shape from points                              |
| `group`                 | `children`                           | rotation / flipX / flipY                         | container of child objects                            |
| `container`             | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation                  | titled region (module, subsystem, boundary)           |
| `sticky`                | `x`,`y`,`width`,`height`             | fill / text / rotation                           | sticky note (no stroke or `rx`)                       |
| `svg`                   | `x`,`y`,`width`,`height` + `svgText` | rotation only                                    | raw SVG escape hatch (opaque box)                     |
| `connector` (in `root`) | `source`,`target`,`points:[]`        | stroke / startArrow / endArrow / routing / label | edge / arrow between objects                          |

<!-- AUTOGEN:END object-quick-reference -->

**Style values**

- Colors (`stroke` / `fontColor` / `fill`): a CSS color string, or `"auto"` to follow the editor theme. `"auto"` is the default for `stroke` / `fontColor` (resolved to the theme foreground) and adapts to light/dark; `fill` defaults to `"transparent"`. Prefer `"auto"` (or omit the field) unless a specific color is needed.
- Stroke: `stroke` (color, default `"auto"`), `strokeWidth` (default 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`
- Fill: `fill` (default `"transparent"`)
- Text (every box shape, and `text`): `text`, `textAlign`: `"left"`/`"center"`/`"right"`, `verticalAlign`: `"top"`/`"middle"`/`"bottom"`, `fontColor` (default `"auto"`), `fontSize` (default 16). For `diamond` and `stadium`, text is placed within the full bounding box (not clipped to the shape interior). For `db`, text is placed in the body region below the top cap ellipse. For `cloud`, text is placed in a reduced central region inside the bumps, so give the shape generous width/height. For `document` and `callout`, text sits above the bottom wave/tail band. For `multiDocument`, text is confined to the front (bottom-left) sheet, so give the shape generous size. For `actor`, `server`, `package`, `envelope`, `queue`, `gear`, `lock`, `extract` and `cross`, the drawing fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and omitting `text` leaves a bare figure. **`record` is the exception: its `text` is a keyed object, and the typography lives inside each slot rather than on the shape** (see the record entry below).
- Bare text (`text` only): a label with no box, outline or fill around it — titles, captions, free annotations. It takes `x`,`y` (top-left of the text) plus the Text and Transform fields and **nothing else**: no `width` / `height`, because the box is measured from the content and grows right and down as the text gets longer, so `fontSize` (and `fontWeight`) is how you size it. With `rotation` or a flip set, "right and down" means the shape's own axes, so `x`,`y` stay put whatever the text does. Since the box hugs the text, `textAlign` shows up only across the lines of a multi-line `text`, and `verticalAlign` has nothing to move within. It is **connectable**: its four edge midpoints sit on the measured box, so a connector attached to it follows the text as it grows.
- Markdown body (`markdown` only): `text` holds **Markdown source** and is rendered as HTML — headings, lists, tables, code fences, links, and math (`$...$` inline, `$$...$$` block). Every other shape draws `text` as plain text, so reach for `markdown` whenever the content needs structure (notes, specs, summaries), and keep `rect` for one-line labels. Defaults suit a document: 300x200, `textAlign` `"left"`, `verticalAlign` `"top"`, `fill` `"auto"`. Content taller than `height` is clipped, so leave headroom. Image export flattens it to plain text.
- Connector label (edge label, e.g. `"Yes"`/`"No"`): a connector has **no** top-level `text`. Put the annotation in a nested `label` object: `"label": { "text": "Yes" }`. Optional fields: `position` (0–1 along the path, default 0.5 = midpoint), `offset` (perpendicular shift, default 0), `fontColor` (default `"auto"`), `fontSize` (default 16), `fontWeight`, plus background/border — `fill` (default canvas background = masks the line; `"transparent"` to show the line), `stroke` (border color), `strokeWidth` (border width, default 0 = no border), `strokeDashType` (border line style: `"solid"`/`"dashed"`/`"dotted"`). Plain text only; the label is drawn horizontally at the midpoint by default. Omit `label` for no label.
- Arrows `startArrow`/`endArrow`: `"None"` / `"FilledTriangle"` (standard arrow) / `"OpenArrow"` / `"HollowTriangle"` / `"FilledDiamond"` / `"HollowDiamond"` / `"ConcaveTriangle"` / `"Circle"` / `"HollowCircle"` / `"Cross"`
- UML relationships combine an arrow with `strokeDashType`: generalization = `"HollowTriangle"` + solid, realization = `"HollowTriangle"` + `"dashed"`, dependency = `"OpenArrow"` + `"dashed"`, association = `"OpenArrow"` + solid, aggregation = `"HollowDiamond"`, composition = `"FilledDiamond"`, non-navigable end = `"Cross"`
- ER cardinality (crow's foot notation) goes on the end nearest the entity it describes: `"CrowFootMany"` (many) / `"CrowFootOneMany"` (`1..*`) / `"CrowFootZeroMany"` (`0..*`) / `"CrowFootOne"` (`1..1`) / `"CrowFootZeroOne"` (`0..1`). A one-to-many relationship therefore sets **both** ends, e.g. `"startArrow": "CrowFootOne"` with `"endArrow": "CrowFootZeroMany"`

**Connector endpoints (EndpointRef)**

```json
"source": {
  "owner": { "id": "node-a" },
  "anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

- `anchor.kind`: `"connectPoint"` (+ `id`) / `"center"` / `"edge"` (+ `side`, `t`) / `"free"` (+ `point`)
- `connectPoint` `id`: `"topCenter"`/`"rightCenter"`/`"bottomCenter"`/`"leftCenter"` (for the center, use `"kind": "center"` instead — it is not a `connectPoint` id). On `brace` / `bracket` / `bracketWithStem` also `"tip"`, the marker's cusp / spine middle / stem end — use it whenever a connector points at a group marker
- `edge`: a free position along one local edge, `{ "kind": "edge", "side": "top", "t": 0.25 }`. Only when a named anchor cannot express where the line has to land (several parallel lines into one edge); `t` runs left→right on top/bottom, top→bottom on left/right, and `0.5` is the edge midpoint — write that as a `connectPoint` instead
- `owner` may reference **any box shape, and `text`** — that is, every type except `polyline` / `polygon` / `group` / `svg` / `connector`. You **cannot** attach an endpoint to those five. To point an arrow at/from one of them, use a `free` endpoint placed near it instead.
- A free point not attached to any object: `{ "anchor": { "kind": "free", "point": { "x": 400, "y": 200 } } }` (no `owner`)

### Styling part of a text

A shape's typography (`fontSize`, `fontColor`, `fontWeight`, …) applies to its
whole text. To draw **part** of it differently — one bold word, one phrase in red
— write that `text` as an array of runs instead of a string: each run is
`{ "text": "..." }` plus the fields it overrides, and the runs are concatenated in
order to form the text.

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
- Write a plain string unless part of the text has to be drawn differently. A
  text drawn in one style is a plain string — that is the form every reader
  expects, and the array is noise on it.
- Non-canonical runs are normalized on write: a run list in which nothing is
  styled collapses back to a plain string, adjacent runs drawn alike merge, and
  empty runs drop. Prefer writing clean runs, but the file is not rejected for
  them.
- The same applies inside a `record`: a band's `text` and each entry of a
  compartment's rows take either form (see below).

### Record (`record`) — the one shape whose `text` is an object

Use `record` for a **titled box with compartments of rows**: a UML class, an ER
entity, an ontology concept with its properties. Its `text` is a set of named
slots and a plain string is rejected — put the title in `name.text` and **one
array entry per row** in a compartment's `text` (never a newline inside an entry).

**Which slots you write is what gives the box its compartments.** There are four:
`stereotype`, `name` (always drawn), `attributes`, and `operations`, stacked in
that order. Leave a slot out entirely and the box does not have it. `stereotype`
is an optional thin band above the title — write it for an interface, an abstract
class, or an enum (`{ "text": "<<interface>>" }`); no divider separates it from
`name`, so the two read as one header.

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

A UML class adds the `operations` slot; a DTO, an ER entity, or a value object
leaves it out and stays two-compartment:

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
keeps the compartment and draws it empty, which is how you say "this class has no
operations" rather than "this box has no operations compartment".

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

`name` and `stereotype` are the other way round: each is **one body**, a string
or an array of runs, never a list of rows and never `[]` (an empty title is
`""`). Writing rows there is rejected with `must be one body of text, not rows`.

Each slot carries **its own** typography (`textAlign` / `verticalAlign` /
`fontColor` / `fontSize` / `fontFamily` / `fontWeight` / `fontStyle` /
`textDecoration`, all optional and written
beside `text`); a `record` has **no shape-wide** text fields, so writing them at
the top level is an error. Slot defaults follow what the slot is for — the
`stereotype` and `name` bands are centered (and `name` is bold), the row
compartments are `textAlign` `"left"` / `verticalAlign` `"top"`, and every slot is
`fontSize` `14` (the 21px row pitch is sized for it) — and `fill` defaults to
`"auto"` like `markdown`. Every band draws exactly what its slot's typography
says; rows are packed one line per entry.

The **height is never adjusted to the content** — the compartments divide up
whatever height you give. Each compartment above the bottom one takes the height
its own rows need (`21 * rows + 4`, and 25 when empty); the bottom one takes the
remainder and clips anything past the box. So size it yourself:

- title + one compartment of N rows: `32 + 21 * N`
- add a second compartment of M rows: `+ 21 * M + 4`
- add a `stereotype` band: `+ 28`

The **header bands** are the parts that grow with their text: a larger
`fontSize`, a newline, or a string too long for the `width` makes the band taller
(one 1.5×fontSize line per displayed line plus 7px) and pushes the compartments
down, so add that much to the `height` too.

### Raw SVG (`svg`) — escape hatch for complex visuals

Use `svg` **only** when the built-in shapes (rect / ellipse / polyline / polygon) genuinely cannot express what you need — e.g. icons, logos, gradients, or ready-made technical figures. Prefer the built-in shapes for ordinary boxes, nodes, and arrows; they stay editable, themeable, and connectable.

- It is an **opaque box**: `x`,`y` (top-left) + `width`,`height` define where/how big it is drawn. The SVG content is scaled to fit that box.
- `svgText` holds the **inline SVG markup** (must start with `<svg ...>`). Include a **`viewBox`** so the content scales correctly to the box; the intrinsic size is read from it automatically (if the `viewBox` is missing, the markup's `width`/`height`, or `100x100`, is used as a fallback). You do **not** specify the intrinsic size separately.
- The markup must be **self-contained**: no `<script>`, no event handlers (`on*`), and no external references (`href`/`xlink:href` to URLs). These are stripped at render time, so anything relying on them will not show. Inline `<defs>` / gradients / `<path>` are fine.
- `svg` has **no** text / stroke / fill / `rx` of its own (style lives inside the markup), and it is **not connectable** — point connectors near it with a `free` endpoint.
- When you place **multiple** `svg` objects, give every internal `id` (gradients, filters, clip paths, etc.) a **document-unique** name (e.g. `grad-logo1`, not `grad`). All markup shares one DOM, so duplicate ids make `url(#id)` references resolve to the wrong (first) definition.

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

## 5. Layout conventions (for readability)

These are guidelines for readability, not part of the spec. Overlapping itself is allowed (see "Coordinate system").

- Standard node: `width: 160`, `height: 80`.
- Spacing between nodes: horizontal **80–120px**, vertical **60–100px**.
- Keep a single flow direction (left→right or top→bottom).
- Choose connect points to match the connection direction (for left→right, source=`rightCenter`, target=`leftCenter`).

## 6. Worked examples

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

## 7. Common mistakes

- ❌ Putting a connector inside a group's `children` → ✅ keep connectors at the top level of `root`.
- ❌ A connector with both endpoints `free` (no owner) → ✅ at least one endpoint must reference an object.
- ❌ Attaching a connector endpoint (`owner`) to a `polyline`/`polygon`/`group`/`svg` → ✅ only box shapes and `text` are connectable; use a `free` endpoint placed near the target instead.
- ❌ Reaching for `svg` for ordinary boxes/nodes/arrows → ✅ use the built-in shapes; keep `svg` for visuals they cannot express.
- ❌ Putting endpoint coordinates in a connector's `points` → ✅ `points: []`; endpoints go in `source`/`target`.
- ❌ Putting a connector's edge label in a top-level `text` field → ✅ use a nested `label`: `"label": { "text": "Yes" }`.
- ❌ Giving a `group` `x`/`y`/`width`/`height` → ✅ position it via the `children` coordinates.
- ❌ Using `x`/`y`/`width`/`height` on an `ellipse` → ✅ use `cx`/`cy`/`rx`/`ry`.
- ❌ Giving a `text` `width`/`height`, or drawing a caption as a `rect` with an invisible stroke and fill → ✅ use `text` with `x`/`y` only, and size it with `fontSize`.
- ❌ Emitting coordinates that unintentionally overlap → ✅ space them per the layout conventions (overlap itself is allowed).
- ❌ Writing a uniformly styled text as an array of runs → ✅ a plain string; runs are only for a stretch that has to be drawn differently.
- ❌ Putting a run object straight into a `record` compartment's row list (`"text": [{ "text": "..." }]`) → ✅ wrap that row's runs in their own array: `"text": [[{ "text": "..." }]]`.
- ❌ Duplicate `id`s → ✅ make them all unique.
