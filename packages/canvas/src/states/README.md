# States

The directory that manages the application's runtime in-memory data structures (State).
It mirrors the persistence-oriented `model` structure of `@jiscribe/doc` but is optimized for rendering and manipulation performance and convenience.

## Architecture & Design

For the core design principles (Type Composition, Branded Types, ObjectFeatures), see the [@jiscribe/doc README](../../../doc/README.md).

**Key differences:**

- **Utility**: Uses `CreateObjectState` instead of `CreateObjectType`.
- **Geometry**: At runtime, many shapes are treated as a `Frame` (x, y, width, height) that includes bounding box information.
- **Transform**: Instead of `TransformDoc` (rotation, flip), holds a `Transform` (rotation, scaleX, scaleY) that is closer to a computed state.

## Directory Structure

| Directory        | Description                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `canvas/`        | Defines the runtime state of the whole canvas (`CanvasState`) and its conversion to/from Doc (`CanvasMapper`).            |
| `objects/`       | Individual object State definitions and Doc⇔State mappers (`XxxMapper`). Structurally symmetric with the doc `model/`.    |
| `objects/types/` | Utilities that compose State types (`CreateObjectState`). Enums are reused from `@jiscribe/doc`'s `model/objects/types/`. |
| `objects/utils/` | Runtime helpers that assist State validation (`validateStateUtils`, etc.).                                                |
| `utils/`         | Cross-object runtime geometry computations (`calculateGroupOrientedBounds`, etc.).                                        |
| `registry/`      | Registries of per-type Mappers and State validators (registration is described below).                                    |

## Registry initialization

The registries under `registry/` (`ObjectMapperRegistry` / `ObjectStateValidatorRegistry`) are registered **all at once** by `registerObject()` in `controllers/registries/initializeObjectRegistry.ts`, together with the other registries such as rendering / gestures / menu. The doc-validator registry on the `@jiscribe/doc` side is not part of that bundle: it is needed only at parse time, so `createCanvasParser` builds one per parser instance.

## Usage Example

Generates a State type by reusing the `ObjectFeatures` defined in `@jiscribe/doc`.

```typescript
// Example: RectState.ts
import type { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectStateBrand: unique symbol;

export type RectState = CreateObjectState<
	typeof RectFeatures,
	typeof RectStateBrand
>;
```
