# Jiscribe AI Authoring Guide

A practical guide for an AI to correctly generate and edit Jiscribe `.jis.json` (diagram data).
It focuses on the essentials. For the full field-level specification, see [`reference.md`](./reference.md).

---

## 1. Coordinate system (read this first)

- The canvas is an **infinite plane**. Coordinates follow the SVG convention: **x increases to the right, y increases downward** (the opposite of math; screen coordinates). Unit is **px**.
- Coordinate values are arbitrary (**negatives are allowed**). The origin `(0, 0)` is **not** pinned to the top-left of the screen (the view pans and zooms).
- Each shape has its own reference point: **every box shape (`rect`, `diamond`, `stadium`, `parallelogram`, `hexagon`, `cloud`, `document`, `actor`, `callout`, `db`, `subroutine`, `trapezoid`, `manualInput`, `card`, `delay`, `display`, `extract`, `cross`, `sticky`) uses its top-left corner `(x, y)`**, **`ellipse` uses its center `(cx, cy)`** (see "Object quick reference").
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
- `root`: array of shapes (rect / ellipse / diamond / stadium / parallelogram / hexagon / cloud / document / actor / callout / db / subroutine / trapezoid / manualInput / card / delay / display / extract / cross / polyline / polygon / group / sticky / svg) **and connectors**, in z-order (back → front). The array order is the stacking order. Connectors (`"type": "connector"`) sit at the top level among the objects; they are **never** placed inside a group's `children`.

## 3. MUST / MUST NOT (violations break the file)

**MUST**

- Include **`version: 1`** at the top level (required, fixed value).
- Give every object a **unique `id`** and a **`type`**.
- `rect` uses `x`,`y` (top-left) + `width`,`height`. `ellipse` uses `cx`,`cy` (center) + `rx`,`ry` (radii). `diamond`, `db`, and the other box shapes (`stadium` / `parallelogram` / `hexagon` / `cloud` / `document` / `actor` / `callout` / `subroutine` / `trapezoid` / `manualInput` / `card` / `delay` / `display` / `extract` / `cross`) use `x`,`y` (top-left) + `width`,`height`, same as `rect`.
- Put `connector` in `root` (top level, mixed with the objects), and express its endpoints with `source` / `target` (EndpointRef).
- A connector must have **at least one owned endpoint** (`source` or `target` referencing an object). Both endpoints `free` is invalid.
- Leave `points` as an **empty array** `[]` unless you set `"routing": "straight"` and want manual bends.
- Optional `routing`: omitted ⇒ `"orthogonal"` (default) — a right-angle (horizontal/vertical) path auto-generated at render time that **ignores `points`** (keep them `[]`). Set `"routing": "straight"` to draw a straight line through `points` instead. For flowchart-style wiring, just omit `routing`.
- A connector may **loop back to the same object** (`source` and `target` referencing the same `owner.id`) — useful for self-transitions in state machines. Point the two endpoints at different anchors (e.g. `topCenter` and `rightCenter`); it is always drawn as a rectangular orthogonal loop, so leave `routing` omitted and `points` `[]` (a `"straight"` self-loop is ignored).

**MUST NOT**

- Do not put endpoint (start/end) coordinates in a connector's `points`. `points` holds only intermediate waypoints (usually empty).
- Do not attach a connector endpoint (`owner`) to a `polyline`, `polygon`, `group`, `svg`, or `connector`. Only `rect` / `ellipse` / `diamond` / `stadium` / `parallelogram` / `hexagon` / `cloud` / `document` / `actor` / `callout` / `db` / `subroutine` / `trapezoid` / `manualInput` / `card` / `delay` / `display` / `extract` / `cross` / `sticky` are connectable; use a `free` endpoint to point near other types.
- Do not give a `group` `x`,`y`,`width`,`height`. Its position comes from its `children`.
- Do not reuse the same `id`.
- Do not put a `connector` inside a group's `children` (connectors live at the top level of `root` only).

## 4. Object quick reference

| `type`                  | Required geometry                    | Main styles                                                      |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `rect`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / `rx` (rounded) / rotation                 |
| `ellipse`               | `cx`,`cy`,`rx`,`ry`                  | stroke / fill / text / rotation                                  |
| `diamond`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (decision node)                  |
| `stadium`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (start/end terminator)           |
| `parallelogram`         | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (input/output)                   |
| `hexagon`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (preparation)                    |
| `cloud`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (external system, fuzzy concept) |
| `document`              | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (report, file)                   |
| `actor`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (user, role, stakeholder)        |
| `callout`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (annotation bubble)              |
| `db`                    | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (data store)                     |
| `subroutine`            | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (predefined process / call)      |
| `trapezoid`             | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (manual operation)               |
| `manualInput`           | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (manual/keyed input)             |
| `card`                  | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (punched-card data)              |
| `delay`                 | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (wait/delay)                     |
| `display`               | `x`,`y`,`width`,`height`             | stroke / fill / text / rotation (output to display)              |
| `extract`               | `x`,`y`,`width`,`height`             | stroke / fill / rotation (merge/marker; **no text**)             |
| `cross`                 | `x`,`y`,`width`,`height`             | stroke / fill / rotation (junction/marker; **no text**)          |
| `polyline`              | `points` (open line)                 | stroke / startArrow / endArrow                                   |
| `polygon`               | `points` (auto-closed)               | stroke / fill                                                    |
| `group`                 | `children`                           | rotation / flipX / flipY                                         |
| `connector` (in `root`) | `source`,`target`,`points:[]`        | stroke / startArrow / endArrow / routing / label                 |
| `sticky`                | `x`,`y`,`width`,`height`             | fill / text (no stroke or rx)                                    |
| `svg`                   | `x`,`y`,`width`,`height` + `svgText` | rotation only (opaque box; no stroke/fill/text)                  |

**Style values**

- Colors (`stroke` / `fontColor` / `fill`): a CSS color string, or `"auto"` to follow the editor theme. `"auto"` is the default for `stroke` / `fontColor` (resolved to the theme foreground) and adapts to light/dark; `fill` defaults to `"transparent"`. Prefer `"auto"` (or omit the field) unless a specific color is needed.
- Stroke: `stroke` (color, default `"auto"`), `strokeWidth` (default 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`
- Fill: `fill` (default `"transparent"`)
- Text (every box shape **except `extract` / `cross`, which hold no text**: rect / ellipse / diamond / stadium / parallelogram / hexagon / cloud / document / actor / callout / db / subroutine / trapezoid / manualInput / card / delay / display / sticky): `text`, `textAlign`: `"left"`/`"center"`/`"right"`, `verticalAlign`: `"top"`/`"middle"`/`"bottom"`, `fontColor` (default `"auto"`), `fontSize` (default 16). For `diamond` and `stadium`, text is placed within the full bounding box (not clipped to the shape interior). For `db`, text is placed in the body region below the top cap ellipse. For `cloud`, text is placed in a reduced central region inside the bumps, so give the shape generous width/height. For `document` and `callout`, text sits above the bottom wave/tail band. For `actor`, text is the label band below the stick figure — keep it short.
- Connector label (edge label, e.g. `"Yes"`/`"No"`): a connector has **no** top-level `text`. Put the annotation in a nested `label` object: `"label": { "text": "Yes" }`. Optional fields: `position` (0–1 along the path, default 0.5 = midpoint), `offset` (perpendicular shift, default 0), `fontColor` (default `"auto"`), `fontSize` (default 16), `fontWeight`, plus background/border — `fill` (default canvas background = masks the line; `"transparent"` to show the line), `stroke` (border color), `strokeWidth` (border width, default 0 = no border), `strokeDashType` (border line style: `"solid"`/`"dashed"`/`"dotted"`). Plain text only; the label is drawn horizontally at the midpoint by default. Omit `label` for no label.
- Arrows `startArrow`/`endArrow`: `"None"` / `"FilledTriangle"` (standard arrow) / `"OpenArrow"` / `"HollowTriangle"` / `"FilledDiamond"` / `"HollowDiamond"` / `"ConcaveTriangle"` / `"Circle"`

**Connector endpoints (EndpointRef)**

```json
"source": {
  "owner": { "id": "node-a" },
  "anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

- `anchor.kind`: `"connectPoint"` (+ `id`) / `"center"` / `"free"` (+ `point`)
- `connectPoint` `id`: `"topCenter"`/`"rightCenter"`/`"bottomCenter"`/`"leftCenter"` (for the center, use `"kind": "center"` instead — it is not a `connectPoint` id)
- `owner` may reference **only a box shape (`rect` / `ellipse` / `diamond` / `stadium` / `parallelogram` / `hexagon` / `cloud` / `document` / `actor` / `callout` / `db` / `subroutine` / `trapezoid` / `manualInput` / `card` / `delay` / `display` / `extract` / `cross` / `sticky`)**. You **cannot** attach an endpoint to a `polyline`, `polygon`, `group`, `svg`, or `connector`. To point an arrow at/from one of those, use a `free` endpoint placed near it instead.
- A free point not attached to any object: `{ "anchor": { "kind": "free", "point": { "x": 400, "y": 200 } } }` (no `owner`)

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
- ❌ Attaching a connector endpoint (`owner`) to a `polyline`/`polygon`/`group`/`svg` → ✅ only box shapes (`rect`/`ellipse`/`diamond`/`stadium`/`parallelogram`/`hexagon`/`cloud`/`document`/`actor`/`callout`/`db`/`subroutine`/`trapezoid`/`manualInput`/`card`/`delay`/`display`/`extract`/`cross`/`sticky`) are connectable; use a `free` endpoint placed near the target instead.
- ❌ Reaching for `svg` for ordinary boxes/nodes/arrows → ✅ use the built-in shapes; keep `svg` for visuals they cannot express.
- ❌ Putting endpoint coordinates in a connector's `points` → ✅ `points: []`; endpoints go in `source`/`target`.
- ❌ Putting a connector's edge label in a top-level `text` field → ✅ use a nested `label`: `"label": { "text": "Yes" }`.
- ❌ Giving a `group` `x`/`y`/`width`/`height` → ✅ position it via the `children` coordinates.
- ❌ Using `x`/`y`/`width`/`height` on an `ellipse` → ✅ use `cx`/`cy`/`rx`/`ry`.
- ❌ Emitting coordinates that unintentionally overlap → ✅ space them per the layout conventions (overlap itself is allowed).
- ❌ Duplicate `id`s → ✅ make them all unique.
