# Jiscribe AI Authoring Guide

A practical guide for an AI to correctly generate and edit Jiscribe `.jis.json` (diagram data).
It focuses on the essentials. For the full field-level specification, see [`reference.md`](./reference.md).

---

## 1. Coordinate system (read this first)

- The canvas is an **infinite plane**. Coordinates follow the SVG convention: **x increases to the right, y increases downward** (the opposite of math; screen coordinates). Unit is **px**.
- Coordinate values are arbitrary (**negatives are allowed**). The origin `(0, 0)` is **not** pinned to the top-left of the screen (the view pans and zooms).
- Each shape has its own reference point: **`rect` uses its top-left corner `(x, y)`**, **`ellipse` uses its center `(cx, cy)`** (see "Object quick reference").
- Stacking order (z-order) follows the **order of the `root` array** — later entries are drawn on top. Overlapping is allowed.
- There is no auto-layout. You compute coordinates yourself (see "Layout conventions").

## 2. Minimal structure

The top level must always have `version` / `root` / `connectors` (arrays may be empty).

```json
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [],
	"connectors": []
}
```

- `version`: **required, always `1`** (fixed value for this format version).
- `$schema`: optional but **recommended** (enables editor completion and validation).
- `root`: array of shapes (rect / ellipse / polyline / polygon / group / sticky).
- `connectors`: array of connectors. **Connectors must go here (never in `root`).**

## 3. MUST / MUST NOT (violations break the file)

**MUST**

- Include **`version: 1`** at the top level (required, fixed value).
- Give every object a **unique `id`** and a **`type`**.
- `rect` uses `x`,`y` (top-left) + `width`,`height`. `ellipse` uses `cx`,`cy` (center) + `rx`,`ry` (radii).
- Put `connector` in the `connectors` array, and express its endpoints with `source` / `target` (EndpointRef).
- For a straight connector, set `points` to an **empty array** `[]`.

**MUST NOT**

- Do not put endpoint (start/end) coordinates in a connector's `points`. `points` holds only intermediate waypoints (usually empty).
- Do not give a `group` `x`,`y`,`width`,`height`. Its position comes from its `children`.
- Do not reuse the same `id`.
- Do not put a `connector` in `root`.

## 4. Object quick reference

| `type`                        | Required geometry             | Main styles                                      |
| ----------------------------- | ----------------------------- | ------------------------------------------------ |
| `rect`                        | `x`,`y`,`width`,`height`      | stroke / fill / text / `rx` (rounded) / rotation |
| `ellipse`                     | `cx`,`cy`,`rx`,`ry`           | stroke / fill / text / rotation                  |
| `polyline`                    | `points` (open line)          | stroke / startArrow / endArrow                   |
| `polygon`                     | `points` (auto-closed)        | stroke / fill                                    |
| `group`                       | `children`                    | rotation / flipX / flipY                         |
| `connector` (in `connectors`) | `source`,`target`,`points:[]` | stroke / startArrow / endArrow                   |
| `sticky`                      | `x`,`y`,`width`,`height`      | fill / text (no stroke or rx)                    |

**Style values**

- Stroke: `stroke` (color), `strokeWidth` (default 2), `strokeDashType`: `"solid"`/`"dashed"`/`"dotted"`
- Fill: `fill` (default `"transparent"`)
- Text (rect / ellipse / sticky): `text`, `textAlign`: `"left"`/`"center"`/`"right"`, `verticalAlign`: `"top"`/`"middle"`/`"bottom"`, `fontColor`, `fontSize` (default 16)
- Arrows `startArrow`/`endArrow`: `"None"` / `"FilledTriangle"` (standard arrow) / `"OpenArrow"` / `"HollowTriangle"` / `"FilledDiamond"` / `"HollowDiamond"` / `"ConcaveTriangle"` / `"Circle"`

**Connector endpoints (EndpointRef)**

```json
"source": {
  "owner": { "type": "rect", "id": "node-a" },
  "anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

- `anchor.kind`: `"connectPoint"` (+ `id`) / `"center"` / `"free"` (+ `point`)
- `connectPoint` `id`: `"center"`/`"topCenter"`/`"rightCenter"`/`"bottomCenter"`/`"leftCenter"`
- A free point not attached to any object: `{ "anchor": { "kind": "free", "point": { "x": 400, "y": 200 } } }` (no `owner`)

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
		}
	],
	"connectors": [
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "rect", "id": "start" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "process" },
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
				"owner": { "type": "rect", "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "end" },
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
		}
	],
	"connectors": [
		{
			"id": "c1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "ellipse", "id": "client" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "api" },
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
				"owner": { "type": "rect", "id": "api" },
				"anchor": { "kind": "connectPoint", "id": "bottomCenter" }
			},
			"target": {
				"owner": { "type": "rect", "id": "db" },
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

- ❌ Putting a connector in `root` → ✅ put it in `connectors`.
- ❌ Putting endpoint coordinates in a connector's `points` → ✅ `points: []`; endpoints go in `source`/`target`.
- ❌ Giving a `group` `x`/`y`/`width`/`height` → ✅ position it via the `children` coordinates.
- ❌ Using `x`/`y`/`width`/`height` on an `ellipse` → ✅ use `cx`/`cy`/`rx`/`ry`.
- ❌ Emitting coordinates that unintentionally overlap → ✅ space them per the layout conventions (overlap itself is allowed).
- ❌ Duplicate `id`s → ✅ make them all unique.
