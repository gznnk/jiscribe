> 🌐 日本語版: [naming-and-structure.ja.md](./naming-and-structure.ja.md)

# Naming and Structure

## Naming conventions

Follow these prefixes so a function's category is readable from its name alone.

### 1. `calc...` — calculation

Computes a new value from its arguments. Covers geometric calculation, distance
measurement, and any transformation returning a new point or value.

- **Form:** `calc[Subject][Action/Result]`
- **Examples:**
  - `calcBoundingBox(frame)` — the bounding box of a transformed frame
  - `calcEuclideanDistance(x1, y1, x2, y2)` — Euclidean distance between two points
  - `calcRotatedPoint(px, py, cx, cy, angleRad)` — `(px, py)` rotated about
    `(cx, cy)` by `angleRad` radians

### 2. `is...` / `has...` / `can...` — predicate

Returns a boolean about a state, property, or validity. Every type guard in
`src/validators` uses `is`.

- **Examples:**
  - `isPoint(obj)` — whether the value is a valid `Point`
  - `isLineIntersectingBox(p1, p2, box)` — whether a segment crosses a box's edges

### 3. `do...` — predicate over a non-trivial computation

Reads better than `is...` when the check is a computation in its own right
rather than an inspection.

- **Example:**
  - `doSegmentsIntersect(p1, p2, q1, q2)` — whether two segments intersect

### 4. `convert...To...` / `[Source]To[Target]` — conversion

Shape-to-shape conversions take the `convert` prefix; scalar unit conversions
use the bare `XToY` form.

- **Examples:**
  - `convertRectToFrame(rect)` — top-left based to center based
  - `convertTransformedEllipseToFrame(ellipse)` — carries the transform through
  - `degreesToRadians(deg)`, `nanToZero(value)` — scalar conversions

### 5. `apply...` — apply a prepared transformation

The trig-free cores that take pre-computed `cos` / `sin` instead of an angle.
See the `WithTrig` suffix below.

- **Examples:**
  - `applyAffineWithTrig(...)`, `applyInverseAffineWithTrig(...)`

### 6. `sample...` — sample points along a curve

Returns `segments + 1` points, both endpoints inclusive.

- **Examples:**
  - `sampleCubicBezier(...)`, `sampleQuadraticBezier(...)`, `sampleEllipseArc(...)`

Pure functions are the rule throughout the package; nothing here mutates its
arguments.

---

## Numeric and argument conventions

Conventions for passing coordinates, angles, and scale. Hold to these alongside
the naming rules.

### 1. Argument order

Order arguments **subject, then reference, then parameters**. The subject is
what is being computed, the reference positions the subject, and the parameters
are whatever numbers remain.

- `calcRotatedPoint(px, py, cx, cy, angleRad)`: the rotated point `(px, py)` is
  the subject and the center `(cx, cy)` is the reference.

**Always rename a function when changing its argument order.** With every
argument typed `number`, a reordering that keeps the name compiles cleanly at
every call site while silently shifting angles by π.

### 2. Coordinates: scalars or objects

Low-level point math takes flat scalars (`x`, `y`) so that hot paths allocate no
intermediate objects. Functions that operate on a shape take the shape or
`Point` objects directly. Where both variants exist for the same computation,
the scalar one carries a `ByCoords` suffix.

- `doSegmentsIntersect(p1, p2, q1, q2)` / `doSegmentsIntersectByCoords(p1x, p1y, ...)`

### 3. Angle units

- Functions returning an angle carry a `Rad` / `Deg` suffix: `calcVectorAngleRad`,
  `normalizeAngleDeg`.
- Parameters taking an angle carry the unit in the name: `angleRad`, `angleDeg`,
  `rotationDeg`. Never `theta`.
- Exception: `Transform.rotation` keeps its name because it is a persisted
  field. Its JSDoc states that it is in degrees.

### 4. The `WithTrig` suffix

A function whose name ends in `WithTrig` takes pre-computed `cosAngle` /
`sinAngle` rather than an angle. These are the shared cores that let a caller
compute `Math.cos` / `Math.sin` once and transform many points with it, and they
are what the angle-taking wrappers delegate to.

- `calcRotatedPoint` → `calcRotatedPointWithTrig`
- `calcAffineTransformedPoint` → `applyAffineWithTrig`
- `calcInverseAffineTransformedPoint` → `applyInverseAffineWithTrig`

Because `cos(-θ) = cos(θ)` and `sin(-θ) = -sin(θ)`, one `cos` / `sin` pair also
serves the inverse rotation — pass `(cosAngle, -sinAngle)`.

### 5. EPSILON for degeneracy and parallelism

Test for degeneracy and parallelism against the shared `EPSILON` constant
(`src/constants`, `1e-9`, assuming canvas-pixel scale coordinates), never
against `=== 0`.

### 6. Scale contract

`Transform.scaleX` / `scaleY` are flip flags. The `FlipScale` type (`1 | -1`,
`src/types`) narrows the domain so the compiler enforces it; size is carried by
`width` / `height`. Produce the sign through `calcNonZeroSign`, which returns
`1 | -1`, rather than casting.

Widening the domain to `number` (general scale) has to be done together with
general-scale support in the outline functions, which currently ignore scale by
treating a symmetric shape's outline as flip-invariant:
`calcOutlinePointTowardForRotatedFrame` and
`calcOutlinePointTowardForRotatedEllipse`.

### 7. Empty input

Functions that cannot produce a result from an empty point array return `null`
rather than throwing or returning a degenerate value: `calcPolyBoundingBox`,
`calcPolyKeyPoints`, `calcOrientedFrameFromPoints`,
`convertPointsToTransformedFrame`.

---

## Directory structure

- `src/common` — general utilities (unit conversion, basic numeric helpers)
- `src/constants` — shared constants (`EPSILON`)
- `src/geometry` — shape calculations (bounding boxes, key points, intersection, conversion)
- `src/points` — point calculations (distance, rotation, outline hits, curve sampling)
- `src/transform` — affine transformation and its inverse
- `src/types` — TypeScript type definitions
- `src/validators` — type guards

Tests live in a `__tests__` directory beside the code they cover.
