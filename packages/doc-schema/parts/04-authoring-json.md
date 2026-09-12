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
