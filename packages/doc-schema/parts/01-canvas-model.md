## The canvas

- The canvas is an **infinite plane**. Coordinates follow the SVG convention: **x increases to the right, y increases downward** (the opposite of math; screen coordinates). Unit is **px**.
- Coordinate values are arbitrary (**negatives are allowed**). The origin `(0, 0)` is **not** pinned to the top-left of the screen (the view pans and zooms).
- Objects have a **stacking order** (z-order): one is drawn on top of another, and overlapping is allowed.
- There is no auto-layout. You compute coordinates yourself (see "Layout").

## Colors, lines, fill and text

- Colors (`stroke` / `fontColor` / `fill`): a CSS color string, or `"auto"` to follow the editor theme. `"auto"` is the default for `stroke` / `fontColor` (resolved to the theme foreground) and adapts to light/dark; `fill` defaults to `"transparent"`. Prefer `"auto"` (or omit the field) unless a specific color is needed.
- Stroke: `stroke` (color, default `"auto"`), `strokeWidth` (default 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`
- Fill: `fill` (default `"transparent"`)
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

Semi-transparency is not missing, but it is a **color**, not a property:
`rgba(37, 99, 235, 0.15)` or `#2563EB26`. When a fill hides a gridline or a shape
behind it, restyle the fill instead of removing what it covers.
