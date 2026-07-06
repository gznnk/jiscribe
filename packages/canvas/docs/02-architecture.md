> 🌐 日本語版: [02-architecture.ja.md](./02-architecture.ja.md)

# Architecture

The internal structure and layer separation of `canvas`. For the rationale behind these design decisions, see
[Design Philosophy](./01-design-philosophy.md).

## Design Principles

1. **Layer separation**: Clearly separate the data layer (schemas / states), the logic layer (controllers), and the presentation layer (presentations).
2. **One-way dependency**: Higher layers depend on lower layers; dependencies in the reverse direction are forbidden.
3. **Registry pattern**: Resolve per-shape functionality dynamically to ensure extensibility.
4. **Co-location of State + Mapper**: Create a folder per shape and place the State and Mapper together as a set.

## Directory Structure

```
packages/canvas/src/
├── index.ts                # package entry (re-exports Canvas / CanvasDoc / parseCanvasText)
├── parser.ts               # parser-only entry (no UI dependency; for the Node side of the VSCode extension)
├── schemas/                # persistence data type definitions (Doc model) + structural/semantic validation
│   ├── canvas/
│   │   ├── CanvasDoc.ts
│   │   └── validators/     # parseCanvasText / validateStructure / validateSemantics
│   ├── objects/            # base / primitives / connections / annotations / types + per-type validateXxxDoc
│   └── registry/           # ObjectDocValidatorRegistry / ShapeFactoryRegistry (+ initialization)
├── states/                 # runtime state types (State model) + Mapper
│   ├── canvas/             # CanvasState / CanvasMapper / Viewport
│   ├── objects/            # base / primitives / connections / annotations (State + Mapper)
│   └── registry/           # ObjectMapperRegistry / ObjectStateValidatorRegistry
├── controllers/            # state management + business logic
│   ├── Canvas.tsx
│   ├── gestures/           # recognizer + handlers + registry/ (GestureHandlerRegistry / ObjectBehaviorRegistry)
│   ├── commands/           # Command pattern (selection/arrange/arrow/connector/group/history/text/view) + CommandRegistry
│   ├── reducer/            # canvasReducer + CanvasActions
│   ├── hooks/              # useCanvasReducer / useSyncExternalDoc, etc.
│   ├── setup/              # initializeObjectRegistry / initializeGestureHandlerRegistry / initializeCommands
│   ├── ui/                 # UI control (transform controls, menus, icons) incl. ShapePresetRegistry / ObjectMenuRegistry
│   └── utils/
├── presentations/          # pure rendering components (layers / objects / defs)
│   └── objects/registry/   # ObjectComponentRegistry / ShapePreviewRegistry
└── constants/              # theme.ts / precision.ts, etc.
```

For each shape (rect / ellipse / diamond / group / polygon / polyline / connector / sticky / svg), there is a corresponding
`states/objects/.../<shape>/`, `controllers/gestures/handlers/objects/...`, and
`presentations/objects/...`.

## Layer Composition and Dependencies

### Data Layer (schemas + states)

- **schemas/**: Type definitions for persisted data (files) — the Doc model. It has a tree structure (`GroupDoc` holds a `children` array).
- **states/**: Runtime state types (the State model) + Mapper. Normalized into a flat structure (`objects` is a `Record` keyed by ID) to improve the performance of editing operations.

Dependency: `states → schemas` (State is converted from Doc).

### Logic Layer (controllers)

- **gestures/handlers/**: Receive gestures and update `CanvasState`. Under `objects/` are per-shape Controllers (`moveByDelta` / `transformByGroup`) and EventHandlers, and under `base/` is shared transform logic (FrameTransform / PolyTransform / GroupTransform).
- **commands/**: Operations shared by shortcuts, menus, and the toolbar → [Command System](./05-command-system.md).
- **reducer/**: Dispatches actions to the appropriate handlers → [State Update Flow](./06-state-update-flow.md).
- **ui/**: UI control logic such as transform controls and menus.

Dependencies: `controllers → states / schemas`. `controllers → presentations` also exists — mostly for utilities, but some UI controllers additionally import presentation **components** and the component registry (e.g. `PendingConnectorOverlay` → `ConnectorRenderer`, `DragGhost` → `objectComponentRegistry`, `ArrowHeadIconPreview` → `Arrow`). The direction (controllers may depend on presentations, never the reverse) still holds.

### Presentation Layer (presentations)

Pure components (Dumb Components) that receive State as Props and render SVG.
They hold no logic or state, and receive event handlers via Props → [Presentation and Theme](./08-presentation-and-theme.md).

Dependency: `presentations → states` (referenced as the type of Props).

### Registries (distributed — there is no single "registry" layer)

There is **no top-level `src/registry/` directory and no `ObjectRegistry` class**. Instead, per-shape functionality is resolved through several small registries, each **colocated with the layer it belongs to**:

| Registry (singleton)                                    | Location                          | Resolves                                                |
| ------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| `objectDocValidatorRegistry` / `shapeFactoryRegistry`   | `schemas/registry/`               | per-type Doc validator, features, shape factory         |
| `objectMapperRegistry` / `objectStateValidatorRegistry` | `states/registry/`                | Doc ↔ State mapper, State validator                     |
| `gestureHandlerRegistry` / `objectBehaviorRegistry`     | `controllers/gestures/registry/`  | gesture handlers, `moveByDelta` / `transformByGroup`    |
| `objectComponentRegistry` / `shapePreviewRegistry`      | `presentations/objects/registry/` | render component, preview renderer                      |
| `shapePresetRegistry` / `objectMenuRegistry`            | `controllers/ui/...`              | ShapeLibrary presets, per-type ObjectMenu               |
| `commandRegistry`                                       | `controllers/commands/`           | commands (see [Command System](./05-command-system.md)) |

Because each registry keys off the shape type (`"rect"`, `"ellipse"`, …), cross-shape processing can be written type-safely without `if (type === ...)` branching.

`controllers/setup/initializeObjectRegistry()` is the **single place that populates all of these at once** (this "register every type into every registry" step is the concept the docs sometimes loosely call the "ObjectRegistry"; it is a function, not a class). The one exception is `objectDocValidatorRegistry`, which is a schema-layer concern populated lazily by `parseCanvasText` at parse time (so the parser-only entry pulls in no UI dependency) — see [Data Model](./03-data-model-and-persistence.md).

> **On `CanvasMapper`**: whole-document `CanvasDoc ↔ CanvasState` conversion must invoke each shape's Mapper polymorphically, so `states/canvas/CanvasMapper.ts` looks up `objectMapperRegistry` from `states/registry/ObjectMapperRegistry`. This stays **within the `states/` layer** (a registry colocated with the mappers it serves), so it is not a cross-layer exception.

## Dependency Graph

```mermaid
graph TD
    subgraph Presentations["Presentation Layer (presentations)"]
        PresentationComponents["React Components"]
        PresentationUtils["utils (coordinate resolution, etc.)"]
    end
    subgraph Controllers["Logic Layer (controllers)"]
        Gestures["gestures/handlers (+ registry/)"]
        Commands["commands (+ CommandRegistry)"]
        Reducer["reducer"]
        UI["ui"]
        Setup["setup (initializeObjectRegistry populates all registries)"]
    end
    subgraph States["Data Layer"]
        StatesTypes["states/ (State types + Mapper + ObjectMapperRegistry)"]
        SchemasTypes["schemas/ (Doc types + validation + ObjectDocValidatorRegistry)"]
    end

    PresentationComponents --> StatesTypes
    Gestures --> StatesTypes
    Commands --> StatesTypes
    Reducer --> StatesTypes
    UI --> StatesTypes
    UI --> PresentationComponents
    Setup --> StatesTypes
    Setup --> PresentationComponents
    StatesTypes --> SchemasTypes
```

The dependency direction is also enforced in CI (madge `dep:circle`, see [Testing](./09-testing.md)).

## Steps to Add a New Shape

Thanks to the Registry pattern, adding a shape is completed in "6 steps + registration."

1. **Schema**: `schemas/objects/primitives/<Shape>Doc.ts` (+ `validate<Shape>Doc.ts`)
2. **State**: `states/objects/primitives/<shape>/<Shape>State.ts`
3. **Mapper**: `states/objects/primitives/<shape>/<Shape>Mapper.ts` (Doc ↔ State)
4. **Controller**: `controllers/gestures/handlers/objects/primitives/<Shape>Controller.ts` (`moveByDelta` / `transformByGroup`)
5. **Component**: `presentations/objects/primitives/<Shape>/<Shape>.tsx`
6. **Registration**: Register it in **both** setup paths, because they populate different registry sets:
   - `controllers/setup/initializeObjectRegistry.ts` — mapper / component / behavior / state validator / menu (the UI-side registries)
   - `schemas/registry/initializeObjectDocValidatorRegistry.ts` — the Doc validator. **Do not forget this one**: it is a separate, schema-layer registry populated lazily by `parseCanvasText`, so a shape missing here is rejected by the parser as an unknown type even though the UI works.

Without adding branches to existing logic, the shape joins cross-shape processing (transform, snap, rendering) simply by being registered.

## Design Prohibitions

- ❌ `states → controllers` (state definitions must not depend on logic)
- ❌ `schemas → states` (persistence types must not depend on runtime types)
- ❌ `presentations → controllers` (presentation must not depend on logic)
- ❌ Recursive processing in a Mapper (a Mapper converts only its own properties; conversion of child elements is managed centrally by `CanvasMapper`)
- ❌ Shape discrimination in an EventHandler (avoid `if (type === "rect")`; resolve via the Registry)
