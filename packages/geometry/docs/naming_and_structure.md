# Naming Conventions & Directory Structure

## Naming Conventions

To maintain consistency across the codebase, please adhere to the following naming conventions for functions:

### 1. Calculation Functions (`calc...`)

Functions that perform calculations based on input arguments and return a new value should start with `calc`.
This includes geometric calculations, distance measurements, and transformations that return a new point or value.

- **Format:** `calc[Subject][Action/Result]`
- **Examples:**
  - `calcBoundingBox(points)` - Calculates the bounding box for a set of points.
  - `calcDistance(p1, p2)` - Calculates the distance between two points.
  - `calcRotatedPoint(point, center, angle)` - Calculates the coordinates of a point after rotation.
  - `calcCloserPoint(ref, p1, p2)` - Calculates (selects) the point closer to a reference.

### 2. Creation Functions (`create...`)

Functions that generate other functions, objects, or complex data structures (factories) should start with `create`.

- **Format:** `create[Object/Function]`
- **Examples:**
  - `createLinearFunction(p1, p2)` - Creates a linear function from two points.

### 3. Boolean Check Functions (`is...`, `has...`, `can...`)

Functions that return a boolean value indicating a state, property, or validity should start with `is`, `has`, or `can`.

- **Format:** `is[Condition]`, `has[Property]`, `can[Action]`
- **Examples:**
  - `isPoint(obj)` - Checks if an object is a valid Point.
  - `isLineIntersecting(line, boundingBox)` - Checks if a line intersects with a bounding box.

### 4. Conversion Functions (`...To...`)

Functions that convert a value from one unit or format to another should use the `To` pattern.

- **Format:** `[Source]To[Target]`
- **Examples:**
  - `degreesToRadians(deg)` - Converts degrees to radians.
  - `nanToZero(value)` - Converts NaN to zero.

### 5. Action/Process Functions (`do...`, `apply...`)

Functions that perform a specific action or process, especially if they might imply side effects or complex operations (though pure functions are preferred in this library).

- **Examples:**
  - `doSegmentsIntersect(s1, s2)` - Checks if segments intersect (alternative to `is...` if it implies a complex check).

---

## Directory Structure

- `src/common`: General utility functions (conversions, basic math).
- `src/geometry`: Geometric shape calculations (lines, rectangles, intersections).
- `src/points`: Point-specific calculations (distance, rotation).
- `src/transform`: Affine transformations and related logic.
- `src/types`: TypeScript type definitions.
- `src/validation`: Type guards and validation logic.
