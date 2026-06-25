# Jiscribe Document Format Reference (`.jis.json`)

Specification for **Jiscribe**'s `.jis.json` document format.
Use it as a reference when an AI generates data, or when an external tool produces `.jis.json` files.
(For a concise, practical guide, see [`ai-guide.md`](./ai-guide.md).)

---

## Top-level structure

```json
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [
		/* array of ObjectDoc and connectors, in z-order (back to front) */
	]
}
```

| Field     | Type          | Required | Description                                                                                                                                          |
| --------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version` | `1`           | ✅       | Schema version. Always `1` (fixed value).                                                                                                            |
| `$schema` | `string`      | -        | Schema URL (recommended; enables editor completion/validation).                                                                                      |
| `root`    | `ObjectDoc[]` | ✅       | All objects and connectors in z-order (back→front); array order is the stacking order. Includes nested groups; connectors sit at the top level only. |

---

## Common ObjectDoc fields

Base fields present on every object.

| Field  | Type     | Required | Description                                       |
| ------ | -------- | -------- | ------------------------------------------------- |
| `id`   | `string` | ✅       | Identifier unique within the document.            |
| `type` | `string` | ✅       | Object type (see below).                          |
| `meta` | `object` | -        | Arbitrary metadata (`name`, `description`, etc.). |

### MetaDoc (`meta` field)

```json
{
	"meta": {
		"name": "Main title",
		"description": "Description of this object"
	}
}
```

In addition to `name` and `description`, `meta` may hold any custom keys.

---

## Object types

| `type`      | Description                  | Geometry                                | Styles                                |
| ----------- | ---------------------------- | --------------------------------------- | ------------------------------------- |
| `rect`      | Rectangle                    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform, Radius |
| `ellipse`   | Ellipse                      | `cx`, `cy`, `rx`, `ry`                  | Stroke, Fill, Text, Transform         |
| `diamond`   | Diamond (decision/branch)    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `polyline`  | Polyline (open path)         | `points`                                | Stroke                                |
| `polygon`   | Polygon (closed path)        | `points`                                | Stroke, Fill                          |
| `group`     | Group (contains children)    | none                                    | Transform                             |
| `connector` | Connector (placed in `root`) | `points`                                | Stroke                                |
| `sticky`    | Sticky note                  | `x`, `y`, `width`, `height`             | Fill, Text, Transform (no Stroke)     |
| `svg`       | Raw inline SVG (opaque box)  | `x`, `y`, `width`, `height` + `svgText` | Transform only (rotation/flip)        |

---

## Object details

### `rect` (rectangle)

```json
{
	"id": "rect-1",
	"type": "rect",
	"x": 100,
	"y": 100,
	"width": 200,
	"height": 120,
	"fill": "#4CAF50",
	"stroke": "#2E7D32",
	"strokeWidth": 2,
	"rx": 8,
	"text": "Text",
	"textType": "text",
	"textAlign": "center",
	"verticalAlign": "middle",
	"fontColor": "#000000",
	"fontSize": 16,
	"fontFamily": "Noto Sans JP",
	"fontWeight": "normal",
	"rotation": 0
}
```

| Field    | Type     | Default | Description               |
| -------- | -------- | ------- | ------------------------- |
| `x`      | `number` | `0`     | X of the top-left corner. |
| `y`      | `number` | `0`     | Y of the top-left corner. |
| `width`  | `number` | `100`   | Width (px).               |
| `height` | `number` | `100`   | Height (px).              |
| `rx`     | `number` | `0`     | Corner radius (SVG `rx`). |

For style fields, see [Stroke style](#stroke-style), [Fill style](#fill-style), [Text style](#text-style), and [Transform style](#transform-style).

---

### `ellipse`

```json
{
	"id": "ellipse-1",
	"type": "ellipse",
	"cx": 300,
	"cy": 200,
	"rx": 100,
	"ry": 60,
	"fill": "#2196F3",
	"stroke": "#1565C0",
	"strokeWidth": 2
}
```

| Field | Type     | Default | Description             |
| ----- | -------- | ------- | ----------------------- |
| `cx`  | `number` | `0`     | X of the center.        |
| `cy`  | `number` | `0`     | Y of the center.        |
| `rx`  | `number` | `50`    | Horizontal radius (px). |
| `ry`  | `number` | `50`    | Vertical radius (px).   |

---

### `diamond`

A diamond (rhombus), typically used for **decision / branch nodes in flowcharts**.
Uses the same rect-based geometry (top-left `x`,`y` + `width`,`height`) as `rect`;
only the rendering is a diamond. Text is laid out within the full bounding box
(not clipped to the diamond interior), and it is **connectable** like `rect`.
It has **no Radius** (`rx`).

```json
{
	"id": "decision-1",
	"type": "diamond",
	"x": 200,
	"y": 150,
	"width": 160,
	"height": 100,
	"fill": "#FFF3E0",
	"stroke": "#EF6C00",
	"strokeWidth": 2,
	"text": "OK?"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `120`   | Bounding-box width (px).          |
| `height` | `number` | `80`    | Bounding-box height (px).         |

---

### `polyline`

```json
{
	"id": "polyline-1",
	"type": "polyline",
	"points": [
		{ "x": 100, "y": 100 },
		{ "x": 200, "y": 150 },
		{ "x": 300, "y": 100 }
	],
	"stroke": "#374151",
	"strokeWidth": 2,
	"startArrow": "None",
	"endArrow": "FilledTriangle"
}
```

| Field        | Type        | Required | Description             |
| ------------ | ----------- | -------- | ----------------------- |
| `points`     | `Point[]`   | ✅       | Array of vertices.      |
| `startArrow` | `ArrowType` | -        | Arrowhead at the start. |
| `endArrow`   | `ArrowType` | -        | Arrowhead at the end.   |

---

### `polygon`

```json
{
	"id": "polygon-1",
	"type": "polygon",
	"points": [
		{ "x": 200, "y": 50 },
		{ "x": 350, "y": 200 },
		{ "x": 50, "y": 200 }
	],
	"fill": "#FFEB3B",
	"stroke": "#F57F17",
	"strokeWidth": 1
}
```

| Field    | Type      | Required | Description                               |
| -------- | --------- | -------- | ----------------------------------------- |
| `points` | `Point[]` | ✅       | Array of vertices (closed automatically). |

---

### `group`

```json
{
	"id": "group-1",
	"type": "group",
	"children": [
		{
			"id": "child-rect-1",
			"type": "rect",
			"x": 10,
			"y": 10,
			"width": 100,
			"height": 60,
			"fill": "#E3F2FD"
		}
	],
	"rotation": 45
}
```

| Field      | Type          | Required | Description                                              |
| ---------- | ------------- | -------- | -------------------------------------------------------- |
| `children` | `ObjectDoc[]` | ✅       | Array of child objects. Must contain at least one child. |

A group has no position or size of its own; these are determined by its `children`.
`rotation`, `flipX`, and `flipY` can be specified as Transform styles.

---

### `sticky` (sticky note)

A sticky note. Its geometry is the same as `rect` (top-left `x`,`y` + `width`,`height`), but it has **no Stroke and no Radius**.
It supports Fill, Text, and Transform.

```json
{
	"id": "sticky-1",
	"type": "sticky",
	"x": 100,
	"y": 100,
	"width": 160,
	"height": 120,
	"fill": "#fef9c3",
	"text": "Note",
	"textAlign": "center",
	"verticalAlign": "middle",
	"fontColor": "#000000",
	"fontSize": 14
}
```

| Field    | Type     | Default     | Description               |
| -------- | -------- | ----------- | ------------------------- |
| `x`      | `number` | `0`         | X of the top-left corner. |
| `y`      | `number` | `0`         | Y of the top-left corner. |
| `width`  | `number` | `160`       | Width (px).               |
| `height` | `number` | `120`       | Height (px).              |
| `fill`   | `string` | `"#fef9c3"` | Background color.         |

Some Text-style defaults differ from other shapes (`fontColor` is `"#000000"`, `fontSize` is `14`).

---

### `svg` (raw inline SVG)

An **escape hatch** for visuals the built-in shapes cannot express (icons, logos, gradients, ready-made figures). It is an **opaque box**: its geometry is the same as `rect` (top-left `x`,`y` + `width`,`height`), and the SVG content is scaled to fit that box. The intrinsic size is read from the markup's `viewBox` automatically (no separate size field). It has **no Stroke / Fill / Text / Radius** of its own (styling lives inside the markup) and is **not connectable**. Only Transform (rotation/flip) applies.

The markup is sanitized at render time: `<script>`, event handlers (`on*`), and external references (`href`/`xlink:href` to URLs) are stripped. Keep the SVG self-contained (inline `<defs>`, gradients, `<path>` are fine) and include a `viewBox`. If the markup is missing or fails to parse, a placeholder error icon is shown instead.

Prefer the built-in shapes for ordinary diagrams; reach for `svg` only when necessary.

```json
{
	"id": "svg-1",
	"type": "svg",
	"x": 160,
	"y": 120,
	"width": 120,
	"height": 120,
	"svgText": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"45\" fill=\"#6d28d9\"/></svg>",
	"rotation": 0
}
```

| Field     | Type     | Default | Description                                                                                                                    |
| --------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `x`       | `number` | —       | X of the top-left corner. Required.                                                                                            |
| `y`       | `number` | —       | Y of the top-left corner. Required.                                                                                            |
| `width`   | `number` | —       | Display width (px) — the box the SVG is fitted into. Required.                                                                 |
| `height`  | `number` | —       | Display height (px) — the box the SVG is fitted into. Required.                                                                |
| `svgText` | `string` | —       | Inline SVG markup, starting with `<svg ...>`; include a `viewBox`. Must be self-contained (no script/handlers/URLs). Required. |

For Transform fields (`rotation` / `flipX` / `flipY` / `lockAspectRatio`), see [Transform style](#transform-style).

---

## ConnectorDoc (connector)

A connector object placed in `root` (top level, mixed with the objects in z-order). At least one endpoint must reference an object (both-`free` is invalid).

```json
{
	"id": "connector-1",
	"type": "connector",
	"points": [],
	"source": {
		"owner": { "type": "rect", "id": "rect-1" },
		"anchor": { "kind": "connectPoint", "id": "rightCenter" }
	},
	"target": {
		"owner": { "type": "ellipse", "id": "ellipse-1" },
		"anchor": { "kind": "connectPoint", "id": "leftCenter" }
	},
	"stroke": "#374151",
	"strokeWidth": 2,
	"startArrow": "None",
	"endArrow": "FilledTriangle"
}
```

| Field        | Type          | Required | Description                                                    |
| ------------ | ------------- | -------- | -------------------------------------------------------------- |
| `points`     | `Point[]`     | ✅       | Intermediate waypoints (empty for a straight line; see below). |
| `source`     | `EndpointRef` | ✅       | Start endpoint spec.                                           |
| `target`     | `EndpointRef` | ✅       | End endpoint spec.                                             |
| `startArrow` | `ArrowType`   | -        | Arrowhead at the start.                                        |
| `endArrow`   | `ArrowType`   | -        | Arrowhead at the end.                                          |

Do **not** include endpoint coordinates in `points`. The endpoints are authoritative via `source` / `target`
(EndpointRef) and are resolved dynamically at render time as the connected objects move. `points` holds only the
intermediate waypoints (world coordinates) in source → target order, and is an empty array for straight connectors
(waypoint-based routing is planned and is not yet used for rendering).

### EndpointRef

Choose whether the endpoint is fixed to an object (`OwnedEndpointRef`) or a free point in space (`FreeEndpointRef`).

#### OwnedEndpointRef (attached to an object)

```json
{
	"owner": { "type": "rect", "id": "rect-1" },
	"anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

Options for `anchor.kind`:

| `kind`           | Extra field          | Description                 |
| ---------------- | -------------------- | --------------------------- |
| `"center"`       | none                 | Center of the object.       |
| `"connectPoint"` | `id: ConnectPointId` | A predefined connect point. |

`ConnectPointId` options: `"center"` / `"topCenter"` / `"rightCenter"` / `"bottomCenter"` / `"leftCenter"`

`owner.type` may be **only `rect`, `ellipse`, `diamond`, or `sticky`** — these are
the connectable types. A `polyline`, `polygon`, `group`, `svg`, or `connector`
**cannot** be an endpoint owner; the document is rejected if one is referenced. To
anchor a connector near such a shape, use a `FreeEndpointRef` instead.

#### FreeEndpointRef (free point)

```json
{
	"anchor": { "kind": "free", "point": { "x": 400, "y": 200 } }
}
```

It has no `owner` field, and `anchor.kind` is always `"free"`.

---

## Common style fields

### Color values (`stroke` / `fontColor` / `fill`)

Color fields accept either a concrete CSS color string, or the sentinel `"auto"`
meaning "follow the theme". `"auto"` is resolved at render time (so the document
stays portable across themes) to a theme color chosen by the field's role:

- `stroke` / `fontColor` → theme **foreground** (ink), so lines and text stay legible.
- `fill` → theme **surface** (panel background).

New shapes default `stroke` and `fontColor` to `"auto"`; `fill` defaults to
`"transparent"`. A concrete color is always shown as-is. Prefer `"auto"` (or
simply omitting the field) unless you need a specific brand/semantic color, so the
diagram adapts to light/dark themes.

### Stroke style

Applies to `rect`, `ellipse`, `diamond`, `polyline`, `polygon`, `connector`.

| Field            | Type             | Default   | Description                                              |
| ---------------- | ---------------- | --------- | -------------------------------------------------------- |
| `stroke`         | `string`         | `"auto"`  | Line color (CSS color, or `"auto"` to follow the theme). |
| `strokeWidth`    | `number`         | `2`       | Line width (px).                                         |
| `strokeDashType` | `StrokeDashType` | `"solid"` | Dash pattern.                                            |

`StrokeDashType`: `"solid"` / `"dashed"` / `"dotted"`

See [Color values](#color-values-stroke--fontcolor--fill) for `"auto"`.

### Fill style

Applies to `rect`, `ellipse`, `diamond`, `polygon`, `sticky`.

| Field  | Type     | Default         | Description                                              |
| ------ | -------- | --------------- | -------------------------------------------------------- |
| `fill` | `string` | `"transparent"` | Fill color (CSS color, or `"auto"` to follow the theme). |

### Text style

Applies to `rect`, `ellipse`, `diamond`, `sticky`.

| Field           | Type            | Default          | Description                                                                       |
| --------------- | --------------- | ---------------- | --------------------------------------------------------------------------------- |
| `text`          | `string`        | `""`             | Text content.                                                                     |
| `textType`      | `TextType`      | `"text"`         | How text is rendered.                                                             |
| `textAlign`     | `TextAlign`     | `"center"`       | Horizontal alignment.                                                             |
| `verticalAlign` | `VerticalAlign` | `"middle"`       | Vertical alignment.                                                               |
| `fontColor`     | `string`        | `"auto"`         | Text color (CSS color, or `"auto"` to follow the theme; sticky uses `"#000000"`). |
| `fontSize`      | `number`        | `16`             | Font size (px).                                                                   |
| `fontFamily`    | `string`        | `"Noto Sans JP"` | Font family.                                                                      |
| `fontWeight`    | `string`        | `"normal"`       | Font weight.                                                                      |

`TextType`: `"text"` (plain text) / `"markdown"` (Markdown rendering)

`TextAlign`: `"left"` / `"center"` / `"right"`

`VerticalAlign`: `"top"` / `"middle"` / `"bottom"`

### Transform style

Applies to `rect`, `ellipse`, `diamond`, `group`. All optional.

| Field             | Type      | Default | Description                        |
| ----------------- | --------- | ------- | ---------------------------------- |
| `rotation`        | `number`  | `0`     | Rotation angle (degrees).          |
| `flipX`           | `boolean` | `false` | Horizontal flip.                   |
| `flipY`           | `boolean` | `false` | Vertical flip.                     |
| `lockAspectRatio` | `boolean` | `false` | Lock aspect ratio (when resizing). |

---

## ArrowType

Used by `startArrow` / `endArrow` on `polyline` and `connector`.

| Value               | Description                       |
| ------------------- | --------------------------------- |
| `"None"`            | No arrowhead.                     |
| `"FilledTriangle"`  | Filled triangle (common arrow).   |
| `"ConcaveTriangle"` | Concave triangle.                 |
| `"OpenArrow"`       | Open arrow (`>`).                 |
| `"HollowTriangle"`  | Hollow triangle.                  |
| `"FilledDiamond"`   | Filled diamond (UML aggregation). |
| `"HollowDiamond"`   | Hollow diamond (UML aggregation). |
| `"Circle"`          | Circle.                           |

---

## Full example

A minimal diagram with a rectangle, an ellipse, and a connector.

```json
{
	"version": 1,
	"root": [
		{
			"id": "start",
			"type": "rect",
			"x": 50,
			"y": 100,
			"width": 160,
			"height": 80,
			"fill": "#E3F2FD",
			"stroke": "#1565C0",
			"strokeWidth": 2,
			"rx": 8,
			"text": "Start",
			"textAlign": "center",
			"verticalAlign": "middle",
			"fontColor": "#1565C0",
			"fontSize": 16
		},
		{
			"id": "process",
			"type": "ellipse",
			"cx": 380,
			"cy": 140,
			"rx": 80,
			"ry": 40,
			"fill": "#F3E5F5",
			"stroke": "#6A1B9A",
			"strokeWidth": 2,
			"text": "Process",
			"textAlign": "center",
			"verticalAlign": "middle",
			"fontColor": "#6A1B9A",
			"fontSize": 14
		},
		{
			"id": "conn-1",
			"type": "connector",
			"points": [],
			"source": {
				"owner": { "type": "rect", "id": "start" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "type": "ellipse", "id": "process" },
				"anchor": { "kind": "connectPoint", "id": "leftCenter" }
			},
			"stroke": "#374151",
			"strokeWidth": 2,
			"startArrow": "None",
			"endArrow": "FilledTriangle"
		}
	]
}
```

---

The machine-readable schema (JSON Schema) is published at `https://schema.jiscribe.dev/v1/jiscribe.schema.json`.
