> 🌐 日本語版: [README.ja.md](./README.ja.md)

# @jiscribe/geometry

Geometry types and calculations shared across jiscribe. Dependency-free, pure
functions only — no rendering, no framework, no state.

## Usage

```typescript
import type { Point, TransformedFrame } from "@jiscribe/geometry";
import { calcFrameKeyPoints, isPoint } from "@jiscribe/geometry";

const frame: TransformedFrame = {
	cx: 50,
	cy: 30,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

const keyPoints = calcFrameKeyPoints(frame);
```

Everything is re-exported from the package root, so import from
`@jiscribe/geometry` rather than reaching into `src/`.

## What is in here

| Directory        | Contents                                                          |
| ---------------- | ----------------------------------------------------------------- |
| `src/types`      | `Point`, `Rect`, `Frame`, `Ellipse`, `Transform`, `KeyPoints`, …  |
| `src/geometry`   | Bounding boxes, key points, intersection tests, shape conversions |
| `src/points`     | Distance, rotation, outline intersection, curve sampling          |
| `src/transform`  | Affine transformation and its inverse                             |
| `src/common`     | Angle conversion and small numeric helpers                        |
| `src/constants`  | `EPSILON`                                                         |
| `src/validators` | Runtime type guards                                               |

Two contracts are worth knowing before writing against this package:

- `Transform.rotation` is in **degrees**, while functions taking an angle
  directly use **radians** (`angleRad`). Convert with `degreesToRadians`.
- `Transform.scaleX` / `scaleY` are **flip flags** (`1 | -1`), not scale
  factors. Size lives in `width` / `height`.

## Development

```bash
pnpm --filter @jiscribe/geometry typecheck
pnpm --filter @jiscribe/geometry lint
pnpm --filter @jiscribe/geometry test
```

## Documentation

- [Naming and Structure](./docs/naming-and-structure.md)
- [Geometry Types](./docs/types.md)
