---
name: jiscribe
description: Use when creating or editing a Jiscribe canvas diagram — a .jis / .jiscribe file, or a flowchart, architecture diagram, sticky-note board or chart the user wants drawn on a Jiscribe canvas.
---

<!-- jiscribe guide 0.10.0+9f6750a7 -->

# Drawing on a Jiscribe canvas

The jiscribe MCP server gives you the tools, and its own instructions say how they are addressed. What follows is what the canvas can hold and how to draw on it well.

To read or write a `.jis` file directly with your own file tools instead of those tools, read `references/authoring-json.md` beside this skill first — it holds the file format.

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
transparency belongs to that color itself. The stroke is centered on the
outline and painted over the fill, so with both translucent the inner half of
the stroke reads darker; for an evenly faded shape, fade only one of the two. A
connector's `label` takes neither opacity field. When a fill hides a gridline or
a shape behind it, restyle the fill instead of removing what it covers.

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
