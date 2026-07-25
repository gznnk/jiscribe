> 🌐 日本語版: [types.ja.md](./types.ja.md)

# Geometry Types

The type system used by `@workspace/geometry`. Types fall into five groups:
basic values, primitive shapes, transformation, transformed shapes, and computed
results.

## 1. Basic values

### `Point`

A point in 2D space.

```typescript
type Point = {
	x: number;
	y: number;
};
```

### `CenterPoint`

A point expressed as center coordinates. `Frame` and `Ellipse` are built on the
same `cx` / `cy` naming.

```typescript
type CenterPoint = {
	cx: number;
	cy: number;
};
```

### `Dimensions`

```typescript
type Dimensions = {
	width: number;
	height: number;
};
```

### `BoundingBox`

An axis-aligned box (AABB) expressed as the coordinates of its four edges.

```typescript
type BoundingBox = {
	top: number;
	left: number;
	right: number;
	bottom: number;
};
```

## 2. Primitive shapes

Primitives are pure geometry: no rotation, no flips. They are the building
blocks every other shape type is composed from.

### `Rect`

A rectangle anchored at its top-left corner.

```typescript
type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};
```

### `Frame`

A rectangle anchored at its center. This is the shape most calculations in the
package operate on.

```typescript
type Frame = {
	cx: number;
	cy: number;
	width: number;
	height: number;
};
```

### `Ellipse`

An ellipse anchored at its center and sized by radii.

```typescript
type Ellipse = {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
};
```

## 3. Transformation

### `FlipScale`

An axis flip flag, never a general scale factor. Restricting the domain to
`1 | -1` makes the contract a compile-time guarantee.

```typescript
type FlipScale = 1 | -1;
```

### `Transform`

Rotation and axis flips applied to a primitive.

```typescript
type Transform = {
	rotation: number; // degrees, not radians
	scaleX: FlipScale; // horizontal flip
	scaleY: FlipScale; // vertical flip
};
```

Two properties are easy to get wrong:

- **`rotation` is in degrees.** Functions that take an angle directly use
  radians and name the parameter `angleRad`, so convert with `degreesToRadians`
  when passing `Transform.rotation` down to them.
- **`scaleX` / `scaleY` only flip.** Size lives in `width` / `height` (or
  `rx` / `ry`); scale never stretches a shape. See
  [the scale contract](./naming-and-structure.md#6-scale-contract) for what it
  would take to widen this to general scale.

## 4. Transformed shapes

A primitive combined with a `Transform`.

```typescript
type TransformedRect = Rect & Transform;
type TransformedFrame = Frame & Transform;
type TransformedEllipse = Ellipse & Transform;
```

## 5. Computed results

Types produced by the calculation functions rather than authored by hand.

### `BoxFeatures`

A `BoundingBox` extended with its center and four corners. Note that these are
corners of the AABB, so they are not the rotated shape's own corners — use
`calcFrameCornerPoints` for those.

```typescript
type BoxFeatures = BoundingBox & {
	center: Point;
	topLeft: Point;
	bottomLeft: Point;
	topRight: Point;
	bottomRight: Point;
};
```

### `KeyPoints`

The eight reference points of a shape: four corners and four edge midpoints.
Used for manipulation handles, connector endpoints, and alignment.

```typescript
type KeyPoints = {
	topLeft: Point;
	topCenter: Point;
	topRight: Point;
	rightCenter: Point;
	bottomRight: Point;
	bottomCenter: Point;
	bottomLeft: Point;
	leftCenter: Point;
};
```

### `KeyPointId`

A key naming a single point of `KeyPoints`. Taken by `calcFrameKeyPoint`, which
computes one point instead of all eight.

```typescript
type KeyPointId = keyof KeyPoints;
```

### `FrameKeyPoints`

The key points of a frame. Currently an alias of `KeyPoints`.

```typescript
type FrameKeyPoints = KeyPoints;
```

## 6. Direction and insets

### `OrthogonalDirection`

An axis-aligned direction, as returned by `snapToDirection`.

```typescript
type OrthogonalDirection = "up" | "down" | "left" | "right";
```

### `RatioInsets`

Insets given as ratios of a frame's dimensions: `top` / `bottom` are relative to
the height, `left` / `right` to the width. Omitted edges mean no inset. Because
they are ratios, an inset rect follows the frame as it resizes.

```typescript
type RatioInsets = {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
};
```

## Choosing a type

| Situation                                                       | Use                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Rotation and flips are irrelevant, or the data is normalized    | `Rect`, `Frame`, `Ellipse`                                  |
| The shape is user-manipulated, rendered, or rotated             | `TransformedRect`, `TransformedFrame`, `TransformedEllipse` |
| You need axis-aligned bounds, hit testing, or alignment anchors | `BoundingBox`, `BoxFeatures`, `KeyPoints`                   |

Most calculations take `Frame` / `TransformedFrame`. `Rect` and `Ellipse` exist
mainly at the boundaries — SVG attributes and persisted documents — and the
`convert*` functions bridge to `Frame` from there.

## Validators

Runtime type guards, one per validatable type. All of them narrow via
`value is T`, and all reject `null` and non-objects.

| Guard                  | Notes                                              |
| ---------------------- | -------------------------------------------------- |
| `isPoint`              |                                                    |
| `isCenterPoint`        |                                                    |
| `isRect`               | `width` / `height` must be non-negative            |
| `isFrame`              | `width` / `height` must be non-negative            |
| `isEllipse`            | `rx` / `ry` must be non-negative                   |
| `isFlipScale`          | The value must be exactly `1` or `-1`              |
| `isTransform`          | `scaleX` / `scaleY` are checked with `isFlipScale` |
| `isTransformedRect`    | `isRect && isTransform`                            |
| `isTransformedFrame`   | `isFrame && isTransform`                           |
| `isTransformedEllipse` | `isEllipse && isTransform`                         |
| `isFrameKeyPoints`     | All eight points must be present and valid         |

The guards for transformed shapes are composed from the primitive and transform
guards:

```typescript
isTransformedRect(value) === isRect(value) && isTransform(value);
```

`BoundingBox`, `BoxFeatures`, `Dimensions`, `OrthogonalDirection` and
`RatioInsets` have no guards — they are produced internally or supplied as
literals, so nothing crosses a runtime boundary as those types.
