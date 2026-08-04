# Jiscribe Document Format Reference (`.jis.json`)

Specification for **Jiscribe**'s `.jis.json` document format.
Use it as a reference when an AI generates data, or when an external tool produces `.jis.json` files.
(For a concise, practical guide, see [`ai-guide.md`](./ai-guide.md).)

---

## Top-level structure

```json
{
	"version": 1,
	"root": [
		/* array of ObjectDoc and connectors, in z-order (back to front) */
	]
}
```

| Field     | Type          | Required | Description                                                                                                                                          |
| --------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version` | `1`           | ✅       | Schema version. Always `1` (fixed value).                                                                                                            |
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

<!-- AUTOGEN:BEGIN object-types -->

| `type`             | Description                                           | Geometry                                | Styles                                |
| ------------------ | ----------------------------------------------------- | --------------------------------------- | ------------------------------------- |
| `rect`             | General-purpose node / label box                      | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform, Radius |
| `markdown`         | Markdown-rendered document card                       | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform, Radius |
| `ellipse`          | Ellipse / oval node (center-based geometry)           | `cx`, `cy`, `rx`, `ry`                  | Stroke, Fill, Text, Transform         |
| `diamond`          | Decision / branch node                                | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `stadium`          | Start / end terminator                                | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `parallelogram`    | Input / output                                        | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `hexagon`          | Preparation                                           | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `cloud`            | External system, fuzzy concept                        | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `document`         | Report, file                                          | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `multiDocument`    | Report batch / file set                               | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `actor`            | User, role, stakeholder                               | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `browserWindow`    | Web UI, screen                                        | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `terminalWindow`   | CLI, shell session                                    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `smartphone`       | Mobile client                                         | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `laptop`           | Desktop client, web client                            | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `server`           | Host, node, running process                           | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `gear`             | Service, batch job, daemon                            | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `package`          | Library, artifact, deployment unit                    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `folder`           | Directory, grouping                                   | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `file`             | Source file, configuration                            | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `envelope`         | Message, event                                        | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `queue`            | Job queue, message queue                              | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `lock`             | Authentication, protected resource                    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `shield`           | Security boundary, trust zone                         | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `callout`          | Annotation bubble                                     | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `note`             | Comment box, UML note                                 | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `brace`            | Group marker, grouping annotation                     | `x`, `y`, `width`, `height`             | Stroke, Text, Transform               |
| `bracketWithStem`  | Group marker with a pointer, grouping annotation      | `x`, `y`, `width`, `height`             | Stroke, Text, Transform               |
| `bracket`          | Group marker, grouping annotation                     | `x`, `y`, `width`, `height`             | Stroke, Text, Transform               |
| `db`               | Data store                                            | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `storedData`       | Generic stored data (file / cache)                    | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `subroutine`       | Predefined process / call                             | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `trapezoid`        | Manual operation                                      | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `manualInput`      | Manual / keyed input                                  | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `card`             | Punched-card style data                               | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `delay`            | Wait / delay                                          | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `loopLimit`        | Loop start (`"flipY": true` for the end)              | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `display`          | Output to a display                                   | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `extract`          | Extract / merge marker                                | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `cross`            | Junction / emphasis marker                            | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `offPageConnector` | Off-page connector (jump to another page)             | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `record`           | Titled box + row compartments (UML class / ER entity) | `x`, `y`, `width`, `height`             | Stroke, Fill, Text (keyed), Transform |
| `polyline`         | Open line                                             | `points`                                | Stroke                                |
| `polygon`          | Closed shape from points                              | `points`                                | Stroke, Fill                          |
| `group`            | Container of child objects                            | none                                    | Transform                             |
| `container`        | Titled region (module, subsystem, boundary)           | `x`, `y`, `width`, `height`             | Stroke, Fill, Text, Transform         |
| `sticky`           | Sticky note (no stroke or `rx`)                       | `x`, `y`, `width`, `height`             | Fill, Text, Transform (no Stroke)     |
| `svg`              | Raw SVG escape hatch (opaque box)                     | `x`, `y`, `width`, `height` + `svgText` | Transform only (rotation/flip)        |
| `connector`        | Edge / arrow between objects                          | `points`                                | Stroke                                |

<!-- AUTOGEN:END object-types -->

**Box shape** below means every object type except `polyline`, `polygon`, `group`,
`svg`, and `connector` — the types that take a bounding box and can own connector
endpoints (the box shapes are exactly the connectable types).

---

## Object details

<!-- AUTOGEN:BEGIN object-details -->

### `rect`

Rectangle shape. It is **connectable** (see `connector`).

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
	"textAlign": "center",
	"verticalAlign": "middle",
	"fontColor": "#000000",
	"fontSize": 16,
	"fontFamily": "Noto Sans JP",
	"fontWeight": "normal",
	"rotation": 0
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `100`   | Bounding-box width (px).          |
| `height` | `number` | `100`   | Bounding-box height (px).         |
| `rx`     | `number` | `0`     | Corner radius (SVG `rx`).         |

For style fields, see [Stroke style](#stroke-style), [Fill style](#fill-style), [Text style](#text-style), and [Transform style](#transform-style).

---

### `ellipse`

Ellipse (oval) shape. It is **connectable** like `rect`.

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

Diamond (rhombus) shape, typically used for decision/branch nodes in flowcharts. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a diamond. Text is laid out within the full bounding box (not clipped to the diamond interior). It is **connectable** like `rect`. It has **no Radius** (`rx`).

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

### `stadium`

Stadium (pill) shape with fully rounded ends, typically used for start/end terminators in flowcharts. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a stadium. Text is laid out within the full bounding box. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "start-1",
	"type": "stadium",
	"x": 40,
	"y": 120,
	"width": 140,
	"height": 60,
	"text": "Start"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `140`   | Bounding-box width (px).          |
| `height` | `number` | `60`    | Bounding-box height (px).         |

---

### `parallelogram`

Parallelogram shape (top edge shifted right), typically used for input/output steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a parallelogram. Text is laid out with a small horizontal inset to stay inside the slanted sides. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "input-1",
	"type": "parallelogram",
	"x": 200,
	"y": 150,
	"width": 140,
	"height": 80,
	"text": "Input"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `140`   | Bounding-box width (px).          |
| `height` | `number` | `80`    | Bounding-box height (px).         |

---

### `hexagon`

Hexagon shape with pointed left/right caps, typically used for preparation steps in flowcharts or emphasis nodes. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a hexagon. Text is laid out with a small horizontal inset to stay inside the caps. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "prepare-1",
	"type": "hexagon",
	"x": 200,
	"y": 150,
	"width": 140,
	"height": 80,
	"text": "Prepare"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `140`   | Bounding-box width (px).          |
| `height` | `number` | `80`    | Bounding-box height (px).         |

---

### `cloud`

Cloud shape, typically used for external systems/networks in architecture diagrams or fuzzy concepts in brainstorming. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a cloud. Text is laid out in a reduced central region inside the bumps, so give it generous width/height for longer text. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "internet-1",
	"type": "cloud",
	"x": 200,
	"y": 150,
	"width": 160,
	"height": 100,
	"text": "Internet"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `160`   | Bounding-box width (px).          |
| `height` | `number` | `100`   | Bounding-box height (px).         |

---

### `document`

Document shape (rect with a wavy bottom edge), typically used for reports/files in flowcharts or deliverables in business diagrams. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a document. Text is laid out above the bottom wave band. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "report-1",
	"type": "document",
	"x": 200,
	"y": 150,
	"width": 140,
	"height": 100,
	"text": "Report"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `140`   | Bounding-box width (px).          |
| `height` | `number` | `100`   | Bounding-box height (px).         |

---

### `actor`

Actor (stick figure) shape, typically used for users/roles in use-case diagrams or stakeholders in business diagrams. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering differs. The stick figure fills the whole box. Text is drawn as a label below the box, auto-sized to the text itself, so the box may be kept small without making the text unreadable. A portrait aspect ratio (e.g. 80x100) looks best. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "user-1",
	"type": "actor",
	"x": 200,
	"y": 150,
	"width": 80,
	"height": 100,
	"text": "User"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `80`    | Bounding-box width (px).          |
| `height` | `number` | `100`   | Bounding-box height (px).         |

---

### `callout`

Speech-bubble callout, typically used for annotations and explanatory comments. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a bubble. The tail stays inside the bounding box, occupying a quarter of it on its side; text is laid out in the bubble body beside it. Point the tail at the annotated object via `tail` (default: bottom edge, position 0.2). It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "callout-1",
	"type": "callout",
	"x": 200,
	"y": 150,
	"width": 160,
	"height": 110,
	"text": "Watch out here"
}
```

| Field    | Type     | Default         | Description                                                                                                                                                                                                    |
| -------- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`      | `number` | `0`             | X of the bounding box's top-left.                                                                                                                                                                              |
| `y`      | `number` | `0`             | Y of the bounding box's top-left.                                                                                                                                                                              |
| `width`  | `number` | `160`           | Bounding-box width (px).                                                                                                                                                                                       |
| `height` | `number` | `110`           | Bounding-box height (px).                                                                                                                                                                                      |
| `tail`   | `object` | bottom at `0.2` | Tail tip placement: `{ "side": ..., "position": ... }`. `side` is the edge the tip sits on (`"top"` / `"right"` / `"bottom"` / `"left"`), `position` is 0–1 along that edge. Point it at the annotated object. |

---

### `note`

Note shape: a box with its top-right corner folded back, holding a comment about the diagram — the UML note. It uses the same rect geometry (x/y/width/height) as `rect` and only swaps the drawing, so it takes text inside the box, unlike the group markers in this package. Give it a landscape box (e.g. 180x110) and left-aligned text, and attach it to what it comments on with a connector. Two shapes are easily mistaken for it, and neither is the same thing: "document" (a wavy bottom edge) is a flowchart step that produces paperwork, and "file" is a portrait pictogram standing for a file on disk. Reach for "note" when the box holds prose _about_ the diagram, and for those two when the shape _is_ one of the things the diagram is about. Where the comment should point at one spot on one shape, `callout` (a bubble with a tail) says so more directly. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "note-1",
	"type": "note",
	"x": 200,
	"y": 150,
	"width": 180,
	"height": 110,
	"text": "Retries are capped at 3"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `180`   | Bounding-box width (px).          |
| `height` | `number` | `110`   | Bounding-box height (px).         |

---

### `brace`

Curly brace shape, used to mark a run of shapes as one group and name it. Uses the same rect-based geometry (x/y/width/height) as `rect`, but the box is the bracket alone: its short side is how far the curve bulges, its long side how far the arms reach. "direction" is the way the tip points, away from what is being grouped — a "left" brace is the typographic "{" and groups what is to its right, so place the box just left of that run and give it a small width (e.g. 24x160). "tipPosition" (0..1) moves the tip along the span, from the top for a left/right brace and from the left for an up/down one. Text is drawn as a label just beyond the tip, auto-sized to the text itself and outside the box, so the box stays a thin band however long the label is. The brace has no fill. Beyond the four edge midpoints it offers a connect point at its tip, "tip": aim a connector at the brace with { "kind": "connectPoint", "id": "tip" } so the line meets the cusp instead of a midpoint of the thin band. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "brace-1",
	"type": "brace",
	"x": 200,
	"y": 150,
	"width": 24,
	"height": 160,
	"text": "Label"
}
```

| Field         | Type     | Default  | Description                                                                                                                                                                                                |
| ------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`           | `number` | `0`      | X of the bounding box's top-left.                                                                                                                                                                          |
| `y`           | `number` | `0`      | Y of the bounding box's top-left.                                                                                                                                                                          |
| `width`       | `number` | `24`     | Bounding-box width (px).                                                                                                                                                                                   |
| `height`      | `number` | `160`    | Bounding-box height (px).                                                                                                                                                                                  |
| `direction`   | `string` | `"left"` | Which way the tip points, away from the grouped shapes (`"left"` / `"right"` / `"up"` / `"down"`). `"left"` is the typographic `{`. Use `"left"`/`"right"` for a tall box, `"up"`/`"down"` for a wide one. |
| `tipPosition` | `number` | `0.5`    | Where the tip sits along the long side, 0–1 from the top (`left`/`right`) or from the left (`up`/`down`). The label hangs off the tip, so this moves the label too.                                        |

---

### `bracketWithStem`

Square bracket with a stem, used to mark a run of shapes as one group and name it at a chosen point. Same box and same "direction" as `bracket`, except that the spine sits half way into the box and a straight stem runs out of it, at right angles, to the outer edge. "tipPosition" (0..1) moves the stem along the span, from the top for a left/right bracket and from the left for an up/down one, and the label hangs off the stem's end, auto-sized to the text itself and outside the box. Use `bracket` instead when the label needs to point at nothing in particular. It has no fill. Beyond the four edge midpoints it offers a connect point named "tip", the stem's end, so a connector can meet the stem where the label does. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "bracketWithStem-1",
	"type": "bracketWithStem",
	"x": 200,
	"y": 150,
	"width": 24,
	"height": 160,
	"text": "Label"
}
```

| Field         | Type     | Default  | Description                                                                                                                                                                                                 |
| ------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`           | `number` | `0`      | X of the bounding box's top-left.                                                                                                                                                                           |
| `y`           | `number` | `0`      | Y of the bounding box's top-left.                                                                                                                                                                           |
| `width`       | `number` | `24`     | Bounding-box width (px).                                                                                                                                                                                    |
| `height`      | `number` | `160`    | Bounding-box height (px).                                                                                                                                                                                   |
| `direction`   | `string` | `"left"` | Which way the stem points, away from the grouped shapes (`"left"` / `"right"` / `"up"` / `"down"`). `"left"` is the typographic `[`. Use `"left"`/`"right"` for a tall box, `"up"`/`"down"` for a wide one. |
| `tipPosition` | `number` | `0.5`    | Where the stem leaves the spine, 0–1 from the top (`left`/`right`) or from the left (`up`/`down`). The label hangs off the stem's end, so this moves the label too.                                         |

---

### `bracket`

Square bracket shape, used to mark a run of shapes as one group and name it. Same box and same "direction" as `brace` — a "left" bracket is the typographic "[" and groups what is to its right — but it is drawn with straight lines only: a spine along the outer edge with a foot at each end, reaching towards the grouped shapes. It has no "tipPosition", because nothing on it singles out a place along the spine; the label always sits just beyond the middle of the spine, auto-sized to the text itself and outside the box. Use `bracketWithStem` instead when the label should point at one particular place in the run. The bracket has no fill. Beyond the four edge midpoints it offers a connect point named "tip", which for a plain bracket is the middle of the spine — the same place its label points from. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "bracket-1",
	"type": "bracket",
	"x": 200,
	"y": 150,
	"width": 24,
	"height": 160,
	"text": "Label"
}
```

| Field       | Type     | Default  | Description                                                                                                                                                                                                    |
| ----------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x`         | `number` | `0`      | X of the bounding box's top-left.                                                                                                                                                                              |
| `y`         | `number` | `0`      | Y of the bounding box's top-left.                                                                                                                                                                              |
| `width`     | `number` | `24`     | Bounding-box width (px).                                                                                                                                                                                       |
| `height`    | `number` | `160`    | Bounding-box height (px).                                                                                                                                                                                      |
| `direction` | `string` | `"left"` | Which side the spine sits on, away from the grouped shapes (`"left"` / `"right"` / `"up"` / `"down"`). `"left"` is the typographic `[`. Use `"left"`/`"right"` for a tall box, `"up"`/`"down"` for a wide one. |

---

### `db`

Database cylinder shape, typically used for data stores in architecture or ER diagrams. Uses the same rect-based geometry (x/y/width/height) as `rect`; only the rendering is a cylinder. Text is laid out in the body region below the top cap ellipse (not the full bounding box). It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "db-1",
	"type": "db",
	"x": 200,
	"y": 150,
	"width": 120,
	"height": 100,
	"text": "users"
}
```

| Field    | Type     | Default | Description                       |
| -------- | -------- | ------- | --------------------------------- |
| `x`      | `number` | `0`     | X of the bounding box's top-left. |
| `y`      | `number` | `0`     | Y of the bounding box's top-left. |
| `width`  | `number` | `120`   | Bounding-box width (px).          |
| `height` | `number` | `100`   | Bounding-box height (px).         |

---

### `container`

Container ("frame") shape: a titled rectangle that marks off a region of the diagram, typically a module, subsystem or bounded context. Uses the same rect-based geometry (x/y/width/height) as `rect`. `text` is the title and is drawn in the top header band, never in the body; the body is click-through, so objects lying over it stay directly selectable. Objects are put inside it by geometry alone: give them coordinates within the box and place them after the container in `root` so they paint on top. A container has no `children` and does not carry its contents when it moves — wrap them in a `group` when they must move together. The palette entries Frame / Boundary / Zone are all this type: Boundary is a container with `strokeDashType: "dashed"`, Zone one with a tinted `fill`. It is **connectable** like `rect`. It has **no Radius** (`rx`).

```json
{
	"id": "container-1",
	"type": "container",
	"x": 80,
	"y": 60,
	"width": 360,
	"height": 240,
	"text": "Auth service"
}
```

| Field          | Type     | Default  | Description                                                                                    |
| -------------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `x`            | `number` | `0`      | X of the bounding box's top-left.                                                              |
| `y`            | `number` | `0`      | Y of the bounding box's top-left.                                                              |
| `width`        | `number` | `240`    | Bounding-box width (px).                                                                       |
| `height`       | `number` | `160`    | Bounding-box height (px).                                                                      |
| `headerFill`   | `string` | `"auto"` | Header band color, independent of `fill` (the body). `"auto"` follows the theme surface color. |
| `headerHeight` | `number` | `28`     | Title band height in px, measured down from the top edge (min 1, capped at `height`).          |

---

### Flowchart box shapes (`multiDocument` / `storedData` / `subroutine` / `trapezoid` / `manualInput` / `card` / `delay` / `loopLimit` / `display` / `extract` / `cross` / `offPageConnector`)

All 12 use the **same rect-based geometry** (top-left `x`,`y` + `width`,`height`) and the same Stroke / Fill / Transform styles as `rect`; only the drawn outline differs. They all take Text like `rect`. They are all **connectable** like `rect` and have **no Radius** (`rx`). Set `type` to the value below and give a bounding box.

| `type`             | Outline                                       | Typical use                               |
| ------------------ | --------------------------------------------- | ----------------------------------------- |
| `multiDocument`    | Three stacked wavy-bottom sheets              | Report batch / file set                   |
| `storedData`       | Rectangle with both side edges bowed left     | Generic stored data (file / cache)        |
| `subroutine`       | Rectangle with a vertical bar near each side  | Predefined process / call                 |
| `trapezoid`        | Wide top, narrow bottom                       | Manual operation                          |
| `manualInput`      | Top edge slopes up toward the right           | Manual / keyed input                      |
| `card`             | Rectangle with the top-left corner cut off    | Punched-card style data                   |
| `delay`            | Rectangle whose right edge is a semicircle    | Wait / delay                              |
| `loopLimit`        | Rectangle with both top corners cut off       | Loop start (`"flipY": true` for the end)  |
| `display`          | Pointed left edge, rounded right cap          | Output to a display                       |
| `extract`          | Upward triangle, apex at the top, label below | Extract / merge marker                    |
| `cross`            | Plus sign, label below                        | Junction / emphasis marker                |
| `offPageConnector` | Home-plate pentagon pointing down             | Off-page connector (jump to another page) |

```json
{
	"id": "call-1",
	"type": "subroutine",
	"x": 200,
	"y": 150,
	"width": 140,
	"height": 80,
	"text": "loadUser()"
}
```

<!-- AUTOGEN:END object-details -->

---

### `record` (titled box with row compartments)

A box with a **title band on top and one or two compartments of rows below it** —
a UML class, an ER entity, an ontology concept with its properties. Uses the same
rect-based geometry (top-left `x`,`y` + `width`,`height`) as `rect` and is
**connectable** like it; it has **no Radius** (`rx`).

`record` is the only shape whose **`text` is an object, not a string**: it has
named text slots, and a plain string is rejected. Put the title in `name.text` and
one array entry per row in a compartment's `text` (**no newline inside an entry**
— add another entry). Typography belongs to each slot, so a `record` has **no**
shape-wide `textAlign` / `fontSize` / ... fields.

**The slots you write are the compartments the box has.** There are three —
`name`, `attributes`, `operations` — stacked in that order. `name` is always
drawn; omit either of the others and the box simply does not have that
compartment. An empty array (`{ "text": [] }`) is different: it keeps the
compartment and draws it empty.

```json
{
	"id": "rec-1",
	"type": "record",
	"x": 200,
	"y": 150,
	"width": 180,
	"height": 95,
	"text": {
		"name": { "text": "User" },
		"attributes": { "text": ["id: string", "name: string", "email: string"] }
	}
}
```

A UML class with operations adds the third slot (`"height": 120` fits two rows in
each compartment):

```json
{
	"id": "rec-2",
	"type": "record",
	"x": 420,
	"y": 150,
	"width": 200,
	"height": 120,
	"text": {
		"name": { "text": "Order" },
		"attributes": { "text": ["id: string", "total: number"] },
		"operations": { "text": ["submit()", "cancel()"] }
	}
}
```

| Field                  | Type       | Default | Description                                                       |
| ---------------------- | ---------- | ------- | ----------------------------------------------------------------- |
| `x`                    | `number`   | `0`     | X of the bounding box's top-left.                                 |
| `y`                    | `number`   | `0`     | Y of the bounding box's top-left.                                 |
| `width`                | `number`   | `180`   | Bounding-box width (px).                                          |
| `height`               | `number`   | `95`    | Bounding-box height (px). Not auto-fitted to the rows.            |
| `text.name.text`       | `string`   | `""`    | Title in the top band; the band is always drawn.                  |
| `text.attributes.text` | `string[]` | —       | Attribute rows, one entry per line. Slot absent = no compartment. |
| `text.operations.text` | `string[]` | —       | Operation rows, one entry per line. Slot absent = no compartment. |

Every slot also takes `textAlign` / `verticalAlign` / `fontColor` / `fontSize` /
`fontFamily` / `fontWeight` beside its `text`, with the same meanings as the
shape-wide fields of other shapes. The defaults differ where the compartments
need it: `textAlign` `"left"`, `verticalAlign` `"top"`, `fontSize` `14` (the 21px
row pitch is sized for it); the rest are the shared defaults. `fill` defaults to
`"auto"` (theme surface) rather than `"transparent"`.

The **height is not adjusted to the content**: the compartments divide up whatever
height you give. Every compartment above the bottom one takes the height its own
rows need (`21 × rows + 4`, or 25 when empty); the bottom one takes the remainder
and clips rows below the box edge. Heights that fit exactly:

- title + one compartment of N rows: `32 + 21 × N`
- add a second compartment of M rows: `+ 21 × M + 4`

The **title band** follows its own slot. Its height is
`1.5 × name.fontSize × (displayed lines) + 7`, so raising `name.fontSize`,
writing a newline in `name.text`, or giving a title too long for the `width`
makes the band taller and starts the compartments lower — add the extra to
`height` as well. With the default `fontSize` 14 and a one-line title the band is
the 28px the formulas above assume.

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

### `markdown` (Markdown card)

A card whose `text` is **Markdown source, rendered as HTML** on the canvas. Geometry is the same as `rect` (top-left `x`,`y` + `width`,`height`), and Stroke / Fill / Text / Transform / Radius all apply.

Use it whenever the body needs headings, lists, tables, code fences, links, or math (`$...$` inline, `$$...$$` block). A `rect` **cannot** do this — its `text` is always drawn as plain text. Conversely, for a one-line label inside a shape, keep using `rect` and friends.

```json
{
	"id": "md-1",
	"type": "markdown",
	"x": 100,
	"y": 100,
	"width": 300,
	"height": 200,
	"text": "# Title\n\n- point one\n- point two\n\n`code` and **bold**.",
	"textAlign": "left",
	"verticalAlign": "top"
}
```

| Field    | Type     | Default | Description                                                             |
| -------- | -------- | ------- | ----------------------------------------------------------------------- |
| `x`      | `number` | `0`     | X of the top-left corner.                                               |
| `y`      | `number` | `0`     | Y of the top-left corner.                                               |
| `width`  | `number` | `300`   | Width (px).                                                             |
| `height` | `number` | `200`   | Height (px). Content taller than the box is clipped, so leave headroom. |
| `rx`     | `number` | `0`     | Corner radius (SVG `rx`).                                               |
| `text`   | `string` | `""`    | Markdown source. Use `"\n"` for line breaks.                            |

Some Text-style defaults differ from other shapes, matching how a document reads: `textAlign` is `"left"`, `verticalAlign` is `"top"`, and `fill` is `"auto"` (theme surface) instead of `"transparent"`. `fontSize` is the base size — headings and code scale relative to it.

Image export (PNG/SVG) flattens the rendering to plain text, so do not rely on a Markdown card for the styling of an exported diagram.

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
		"owner": { "id": "rect-1" },
		"anchor": { "kind": "connectPoint", "id": "rightCenter" }
	},
	"target": {
		"owner": { "id": "ellipse-1" },
		"anchor": { "kind": "connectPoint", "id": "leftCenter" }
	},
	"stroke": "#374151",
	"strokeWidth": 2,
	"startArrow": "None",
	"endArrow": "FilledTriangle"
}
```

| Field        | Type                          | Required | Description                                                           |
| ------------ | ----------------------------- | -------- | --------------------------------------------------------------------- |
| `points`     | `Point[]`                     | ✅       | The route's vertices; empty to let the engine route it (see below).   |
| `routing`    | `"straight"` / `"orthogonal"` | -        | Shape of the segments. Omitted ⇒ `"orthogonal"` (default). See below. |
| `source`     | `EndpointRef`                 | ✅       | Start endpoint spec.                                                  |
| `target`     | `EndpointRef`                 | ✅       | End endpoint spec.                                                    |
| `startArrow` | `ArrowType`                   | -        | Arrowhead at the start.                                               |
| `endArrow`   | `ArrowType`                   | -        | Arrowhead at the end.                                                 |
| `label`      | `ConnectorLabel`              | -        | Optional edge label drawn on the connector. See below.                |

Do **not** include endpoint coordinates in `points`. The endpoints are authoritative via `source` / `target`
(EndpointRef) and are resolved dynamically at render time as the connected objects move. `points` holds only the
intermediate vertices (world coordinates) in source → target order. **Empty is the normal case** — it lets the
engine route the whole path.

**Routing.** `routing` is the shape of the segments, and nothing else:

- `"orthogonal"` (**the default when omitted**): every segment is axis-aligned, so the line bends only at right
  angles. The recommended style for flowchart-style wiring — just omit `routing`.
- `"straight"`: segments run at any angle — a single direct line, or a polyline through the vertices.

**Vertices.** Who decides the path is a separate question, answered by `points`. Empty means the engine routes it
end to end; non-empty means `points` **is** the path — the drawn corners are exactly the stored ones. Under
`"orthogonal"` you must therefore keep it axis-aligned yourself: **consecutive points share x or y**, the first
point shares the axis the line leaves the source on, and the last shares the target's. The engine avoids nothing
and straightens nothing; only the vertex next to each endpoint slides along when a connected shape moves, so the
segment touching it stays axis-aligned. Editor operations write that slid position back into `points` when they
commit, so a stored list you read back always matches what is drawn.

Prefer an empty `points`. Reach for vertices only when a specific route matters (steering a line clear of a
crowded area, running several edges down a shared channel), and expect a big layout change to leave the route
detouring — the engine will not re-route it.

**Self-loops.** A connector may connect an object to itself — `source` and `target` whose `owner.id` is the
same object (typically with different anchors, e.g. `topCenter` → `rightCenter`). This is useful for
self-transitions in state machines. With `points` empty it is drawn as a rectangular loop around the object
whatever `routing` says, so leave `routing` omitted and `points` empty.

**Label (`label`).** A connector has **no** top-level `text` field — unlike shapes, its annotation lives in a
nested `label` object (an "edge label" such as `"Yes"` / `"No"` on a decision branch). Omit `label` for no
label.

```json
{
	"type": "connector",
	"source": {
		"owner": { "id": "d1" },
		"anchor": { "kind": "connectPoint", "id": "rightCenter" }
	},
	"target": {
		"owner": { "id": "r1" },
		"anchor": { "kind": "connectPoint", "id": "leftCenter" }
	},
	"label": { "text": "Yes" }
}
```

| Field            | Type     | Required | Description                                                                                                                            |
| ---------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `text`           | `string` | ✅       | Label text. Plain text only (no markdown); use `"\n"` for multiple lines.                                                              |
| `position`       | `number` | -        | Position along the path, `0` (source) – `1` (target). Default `0.5` (midpoint).                                                        |
| `offset`         | `number` | -        | Signed perpendicular offset from the path in world units. Default `0`.                                                                 |
| `fontColor`      | `string` | -        | Label color (CSS color or `"auto"`). Default `"auto"`.                                                                                 |
| `fontSize`       | `number` | -        | Font size in px. Default `16`.                                                                                                         |
| `fontWeight`     | `string` | -        | CSS font-weight (e.g. `"bold"`).                                                                                                       |
| `fill`           | `string` | -        | Background color (CSS color or `"auto"`). Omitted/`"auto"` = canvas background (knockout); `"transparent"` lets the line show through. |
| `stroke`         | `string` | -        | Border color (CSS color or `"auto"`). Only visible when `strokeWidth > 0`.                                                             |
| `strokeWidth`    | `number` | -        | Border width in px. Default `0` (no border).                                                                                           |
| `strokeDashType` | `string` | -        | Border line style: `"solid"` (default), `"dashed"`, `"dotted"`. Visible when `strokeWidth > 0`.                                        |

The label is drawn horizontally (never rotated), centered on its anchor point. By default its background masks the
line behind it for legibility; `fill` / `stroke` / `strokeWidth` customize the background and border.

### EndpointRef

Choose whether the endpoint is fixed to an object (`OwnedEndpointRef`) or a free point in space (`FreeEndpointRef`).

#### OwnedEndpointRef (attached to an object)

```json
{
	"owner": { "id": "rect-1" },
	"anchor": { "kind": "connectPoint", "id": "rightCenter" }
}
```

Options for `anchor.kind`:

| `kind`           | Extra field                                               | Description                     |
| ---------------- | --------------------------------------------------------- | ------------------------------- |
| `"center"`       | none                                                      | Center of the object.           |
| `"connectPoint"` | `id: ConnectPointId`                                      | A predefined connect point.     |
| `"edge"`         | `side: "top" \| "right" \| "bottom" \| "left"`, `t: 0..1` | A free position along one edge. |

`"edge"` is the escape hatch, not the default. Reach for `"center"` or `"connectPoint"` first, and use
`"edge"` only when the connection genuinely has to land where they cannot put it — several parallel
lines arriving at one edge, or a line meeting a specific row of a `record`. `side` and `t` describe the
object's **own local space**, before its rotation and flips, so the anchor stays on the same part of the
shape however the shape is turned. `t` runs left → right on `"top"` / `"bottom"` and top → bottom on
`"left"` / `"right"`; `t: 0.5` is the edge midpoint, which is the same place as the matching
`ConnectPointId` and is clearer written that way.

`ConnectPointId` options: `"topCenter"` / `"rightCenter"` / `"bottomCenter"` / `"leftCenter"` on every
connectable shape, plus whatever extra points the shape's own type names. Today that is `"tip"` on the
three group markers (`brace` / `bracket` / `bracketWithStem`), which is where a connector aimed at one
of them belongs — the cusp, the middle of the spine, or the stem's end, i.e. the place the label points
from. An id the target shape's type does not name — `"tip"` on a `rect`, say — is not an error: the
endpoint falls back to that shape's center. For the center, use `{ "kind": "center" }` (not a `connectPoint`).

The object referenced by `owner.id` may be **only a box shape** — every object type
except `polyline`, `polygon`, `group`, `svg`, and `connector` is connectable. Those
five **cannot** be an endpoint owner; the document is rejected if one is referenced.
To anchor a connector near such a shape, use a `FreeEndpointRef` instead.

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

Applies to every box shape except `sticky`, plus `polyline`, `polygon`, `connector`.

| Field            | Type             | Default   | Description                                              |
| ---------------- | ---------------- | --------- | -------------------------------------------------------- |
| `stroke`         | `string`         | `"auto"`  | Line color (CSS color, or `"auto"` to follow the theme). |
| `strokeWidth`    | `number`         | `2`       | Line width (px).                                         |
| `strokeDashType` | `StrokeDashType` | `"solid"` | Dash pattern.                                            |

`StrokeDashType`: `"solid"` / `"dashed"` / `"dotted"`

See [Color values](#color-values-stroke--fontcolor--fill) for `"auto"`.

### Fill style

Applies to every box shape, plus `polygon`. For `actor`, the fill paints the head circle only. For `record` and `markdown`, the default is `"auto"` rather than `"transparent"` (see their sections).

| Field  | Type     | Default         | Description                                              |
| ------ | -------- | --------------- | -------------------------------------------------------- |
| `fill` | `string` | `"transparent"` | Fill color (CSS color, or `"auto"` to follow the theme). |

### Text style

Applies to every box shape. A `record` holds text too, but has none of these shape-wide fields — its typography lives inside each slot (see its section).

| Field           | Type            | Default          | Description                                                                       |
| --------------- | --------------- | ---------------- | --------------------------------------------------------------------------------- |
| `text`          | `string`        | `""`             | Text content.                                                                     |
| `textAlign`     | `TextAlign`     | `"center"`       | Horizontal alignment.                                                             |
| `verticalAlign` | `VerticalAlign` | `"middle"`       | Vertical alignment.                                                               |
| `fontColor`     | `string`        | `"auto"`         | Text color (CSS color, or `"auto"` to follow the theme; sticky uses `"#000000"`). |
| `fontSize`      | `number`        | `16`             | Font size (px).                                                                   |
| `fontFamily`    | `string`        | `"Noto Sans JP"` | Font family.                                                                      |
| `fontWeight`    | `string`        | `"normal"`       | Font weight.                                                                      |

`TextAlign`: `"left"` / `"center"` / `"right"`

`VerticalAlign`: `"top"` / `"middle"` / `"bottom"`

### Transform style

Applies to every box shape and `group`. All optional.

| Field             | Type      | Default | Description                        |
| ----------------- | --------- | ------- | ---------------------------------- |
| `rotation`        | `number`  | `0`     | Rotation angle (degrees).          |
| `flipX`           | `boolean` | `false` | Horizontal flip.                   |
| `flipY`           | `boolean` | `false` | Vertical flip.                     |
| `lockAspectRatio` | `boolean` | `false` | Lock aspect ratio (when resizing). |

---

## ArrowType

Used by `startArrow` / `endArrow` on `polyline` and `connector`.

| Value                | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `"None"`             | No arrowhead.                                                            |
| `"FilledTriangle"`   | Filled triangle (common arrow).                                          |
| `"ConcaveTriangle"`  | Concave triangle.                                                        |
| `"OpenArrow"`        | Open arrow (`>`). UML dependency / navigable association.                |
| `"HollowTriangle"`   | Hollow triangle. UML generalization (solid line) / realization (dashed). |
| `"FilledDiamond"`    | Filled diamond (UML composition).                                        |
| `"HollowDiamond"`    | Hollow diamond (UML aggregation).                                        |
| `"Circle"`           | Filled circle. UML owned association end; sequence lost/found message.   |
| `"HollowCircle"`     | Hollow circle. UML provided interface (lollipop).                        |
| `"Cross"`            | Cross (`×`) drawn on the line. UML non-navigable association end.        |
| `"CrowFootMany"`     | ER crow's foot: many.                                                    |
| `"CrowFootOneMany"`  | ER crow's foot with a bar: one or many (`1..*`).                         |
| `"CrowFootZeroMany"` | ER crow's foot with a circle: zero or many (`0..*`).                     |
| `"CrowFootOne"`      | ER double bar: exactly one (`1..1`).                                     |
| `"CrowFootZeroOne"`  | ER circle and bar: zero or one (`0..1`).                                 |

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
				"owner": { "id": "start" },
				"anchor": { "kind": "connectPoint", "id": "rightCenter" }
			},
			"target": {
				"owner": { "id": "process" },
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
