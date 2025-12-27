# Type Definitions

This document describes the core data types used in the `@workspace/geometry` package.

## Basic Types

### Point

Represents a point in 2D space.

```typescript
type Point = {
	x: number;
	y: number;
};
```

### Dimensions

Represents the size of an object.

```typescript
type Dimensions = {
	width: number;
	height: number;
};
```

## Rectangular Types

### BoundingBox (formerly Box)

Defines the coordinates for the four sides of a rectangular box.
Used for positioning, layout calculations, collision detection, and clipping.

```typescript
type BoundingBox = {
	top: number;
	left: number;
	right: number;
	bottom: number;
};
```

### Bounds

Defines the rectangular bounds of a diagram element using position and dimensions.
Used for rendering, layout, and defining the geometry of an element.

```typescript
type Bounds = Point & Dimensions;
// Equivalent to:
// {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }
```

### Frame

Defines the geometric properties of a frame, including rotation and scaling.
Uses center coordinates (`cx`, `cy`) for position.

```typescript
type Frame = {
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
};
```

## Usage Guidelines

- Use **BoundingBox** when you need to work with the edges of a rectangle (e.g., checking if a point is within `left` and `right`).
- Use **Bounds** when you need to work with the position and size of a rectangle (e.g., rendering a rect at `x, y` with `width, height`).
