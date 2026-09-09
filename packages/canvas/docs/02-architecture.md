> 🌐 日本語版: [02-architecture.ja.md](./02-architecture.ja.md)

# Architecture

The internal structure and layer separation of `canvas`. For the rationale behind these design decisions, see
[Design Philosophy](./01-design-philosophy.md).

## Design Principles

1. **Layer separation**: Clearly separate, from the bottom up, the data layer (the Doc model in `@jiscribe/doc` plus `states/`), the rendering layer (`rendering/`), and the control layer (`controllers/`). **The control layer is the top layer** — it assembles the rendering layer's components into the screen.
2. **One-way dependency**: Higher layers depend on lower layers; dependencies in the reverse direction are forbidden.
3. **Registry pattern**: Resolve per-shape functionality dynamically to ensure extensibility.
4. **Co-location of State + Mapper**: Create a folder per shape and place the State and Mapper together as a set.

## Directory Structure

```
packages/canvas/src/
├── index.ts                # package entry (re-exports Canvas / CanvasDoc / the parse result types)
├── doc.ts                  # re-export shim onto @jiscribe/doc (the headless entry consumers still name)
├── unstable-doc.ts         # re-export shim onto @jiscribe/doc/unstable
├── png-source.ts           # re-export shim onto @jiscribe/doc/png-source
├── svg-source.ts           # re-export shim onto @jiscribe/doc/svg-source
├── states/                 # runtime state types (State model) + Mapper
│   ├── canvas/             # CanvasState / CanvasMapper
│   ├── objects/            # base / primitives / connector / annotations (State + Mapper)
│   └── registry/           # ObjectMapperRegistry / ObjectStateValidatorRegistry
├── controllers/            # state management + business logic
│   ├── Canvas.tsx
│   ├── gestures/           # recognizer + handlers + registry/ (GestureHandlerRegistry / ObjectBehaviorRegistry)
│   ├── behaviors/          # ObjectBehavior implementations (moveByDelta / transformByGroup / rotateByGroup)
│   ├── commands/           # Command pattern (selection/arrange/arrow/connector/group/history/text/view) + CommandRegistry
│   ├── reducer/            # canvasReducer + CanvasActions
│   ├── hooks/              # useCanvasReducer / useSyncExternalDoc, etc.
│   ├── registries/         # initializeObjectRegistry / initializeGestureHandlerRegistry / initializeCommands
│   ├── ui/                 # UI control (transform controls, menus, icons) incl. StencilRegistry / ObjectMenuRegistry
│   └── utils/
├── rendering/              # pure rendering components (layers / objects / defs) + the Viewport type
│   └── objects/registry/   # ObjectComponentRegistry / ObjectTextRegionRegistry / ObjectOutlineRegistry
├── plugin/                 # extension seam (ObjectTypeDefinition / defineObject / CanvasPlugin)
├── theme/                  # CanvasTheme / presets / CSS vars + the `theme` token object styles read
└── constants/              # zoom.ts / viewport.ts, etc.
```

The Doc model is **not** in this package. It lives in `@jiscribe/doc`
(`packages/doc/src/`), which canvas depends on: `model/` (Doc types + per-type
validation), `plugin/` (`ObjectDocDefinition` / `CanvasDocPlugin` /
`resolveDocDefinitions` / `ObjectDocValidatorRegistry` / `ObjectFactoryRegistry`),
`parse/` (`createCanvasParser` / `validateStructure` / `validateSemantics`), `ops/`
(`createDocOps`), `text/` (text measurement) and `file/` (`.jis.png` / `.jis.svg`
source embedding). The four shim files above re-export it under the
`@jiscribe/canvas/*` paths consumers already use — see
[`packages/doc/README.md`](../../doc/README.md).

For each shape (rect / ellipse / diamond / group / polygon / polyline / connector / sticky / svg), there is a corresponding
`states/objects/.../<shape>/`, `controllers/behaviors/...`, and
`rendering/objects/...`.

## Layer Composition and Dependencies

### Data Layer (`@jiscribe/doc` + states)

- **`@jiscribe/doc`**: Type definitions for persisted data (files) — the Doc model, in its own package (`packages/doc/src/model/`). It has a tree structure (`GroupDoc` holds a `children` array).
- **states/**: Runtime state types (the State model) + Mapper. Normalized into a flat structure (`objects` is a `Record` keyed by ID) to improve the performance of editing operations.

Dependency: `states → @jiscribe/doc` (State is converted from Doc).

### Rendering Layer

Pure components that do nothing but receive State as Props and render SVG.
They hold no logic or state, and receive event handlers via Props → [Rendering and Theme](./08-rendering-and-theme.md).
They are assembled by the control layer above them and know nothing of it.

Dependency: `rendering → states / @jiscribe/doc` (State as the type of Props, plus doc types such as `EndpointRef` and constants such as `AUTO_COLOR`).

### Control Layer

- **gestures/handlers/**: Receive gestures and update `CanvasState`. Under `objects/` and `controls/` are the per-target EventHandlers.
- **behaviors/**: `ObjectBehavior` implementations registered in `ObjectBehaviorRegistry` (`moveByDelta` / `transformByGroup` / `rotateByGroup`). Per-shape Controllers live under `primitives/` and `connector/`, shared transform logic under `base/` (FrameTransform / PolyTransform / GroupTransform). Consumed via the registry from `gestures`, `commands`, `reducer`, and `utils`.
- **commands/**: Operations shared by shortcuts, menus, and the toolbar → [Command System](./05-command-system.md).
- **reducer/**: Dispatches actions to the appropriate handlers → [State Update Flow](./06-state-update-flow.md).
- **ui/**: UI control logic such as transform controls and menus.

Dependencies: `controllers → rendering → states / @jiscribe/doc`. Sitting **above** the rendering layer is why a UI controller importing a rendering **component** (e.g. `PendingConnectorOverlay` → `ConnectorRenderer`, `ArrowHeadIconPreview` → `Arrow`) or a rendering-layer registry context (`RenderingRegistriesProvider`, etc.) is ordinary composition — an upper layer assembling the parts below it — not an exception.

What does remain a structural issue is the pure geometry that lives in the rendering layer. Connector endpoint resolution and orthogonal routing (`rendering/layers/content/utils/endpoints` / `routing`) are consumed not only by `ui` but also by `gestures` (free-endpoint snapping / re-anchoring) and `utils` (freeing endpoints on delete, bounding boxes, visibility); the free-endpoint coordinates persisted on delete go through the same resolution (deliberately, to capture the on-screen position at deletion time). The dependency direction holds, but none of it renders anything — it belongs in a layer below both controllers and rendering.

### Registries (distributed — there is no single "registry" layer)

There is **no top-level `src/registry/` directory and no `ObjectRegistry` class**. Instead, per-shape functionality is resolved through several small registry **classes**, each **colocated with the layer it belongs to**:

| Registry class                                                                                  | Location                                    | Resolves                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ObjectFactoryRegistry` / `ObjectDocValidatorRegistry`                                          | `@jiscribe/doc`, `plugin/`                  | per-type shape factory (create Doc / bounds), Doc validator                                                  |
| `ObjectMapperRegistry` / `ObjectStateValidatorRegistry`                                         | `states/registry/`                          | Doc ↔ State mapper (+ features), State validator                                                             |
| `GestureHandlerRegistry` / `ObjectBehaviorRegistry`                                             | `controllers/gestures/registry/`            | gesture handlers, `moveByDelta` / `transformByGroup`                                                         |
| `ObjectComponentRegistry` / `ObjectTextRegionRegistry` / `ObjectOutlineRegistry`                | `rendering/objects/registry/`               | render component, editable-text region, hit-test / snap outline                                              |
| `StencilRegistry` / `ObjectMenuRegistry` / `PropertyPanelRegistry` / `SelectionControlRegistry` | `controllers/ui/...` (colocated per domain) | StencilLibrary presets, per-type ObjectMenu, per-type properties-sidebar sections, per-type SelectionControl |
| `CommandRegistry`                                                                               | `controllers/commands/`                     | commands (see [Command System](./05-command-system.md))                                                      |

Because each registry keys off the shape type (`"rect"`, `"ellipse"`, …), cross-shape processing can be written type-safely without `if (type === ...)` branching.

The `StencilRegistry` still only answers "what presets exist". Their arrangement is declared by the host: `toolbar.layout` orders the bar (pinned presets and category flyouts), and `stencilLibrary.sections` lists the sections of the **shape library sidebar** — the panel the toolbar's `…` toggle opens to the left of the viewport, which shows every registered stencil grouped and searchable. Both take the same `StencilCategory` shape, and both resolve their `presetIds` against the registry, dropping ids that name nothing and sections left empty. Whether the panel is open and which sections are collapsed are reducer state (`stencilLibraryPanel` (`isOpen` / `collapsedSectionIds`)), driven by the `toggleStencilLibrary` command from the toolbar and by `StencilLibraryPanelHandler` from the panel's own headers and close button. Being a persistent panel, neither field is part of `resetUiState`, so a doc swap leaves it as the user left it. The panel is mounted only while open and takes its width from the viewport (no overlay, no slide). Taking that space moves the viewport's left edge, which would drag the drawing across the screen with it: `useContainerResize` reports the move as `leftEdgeShift` on `CONTAINER_RESIZE` and the reducer takes it off `minX` at the current zoom, so the drawing stays pinned and the panel merely covers and uncovers the strip beside it. The compensation is part of the camera, so the one reported through `onViewportChange` (and read back from `ref.viewport`) carries it while the panel is open: a host that stores that camera and restores it at the next mount with the panel closed sees the drawing sitting the panel's width over the zoom to the side.

The **properties sidebar** is the same mechanism on the other edge, with nothing for the host to declare: every canvas with a toolbar has its toggle, and the panel starts closed. Whether it is open and which of its sections are collapsed are reducer state (`propertyPanel` (`isOpen` / `collapsedSectionIds`)), driven by the `togglePropertyPanel` command from the toolbar toggle, from the ellipsis at the end of the ObjectMenu (through `ObjectMenuHandler`) and from the panel's own close button, which routes through `PropertyPanelHandler`. Like the shape library it is outside `resetUiState`, is mounted only while open, and takes its width from the viewport. While it is open the floating ObjectMenu is not rendered: the sidebar states everything the menu does, so the menu would only duplicate it and cover the drawing beside the selection (the menu's gesture handler stays registered, since the sidebar's controls write through it). Sitting on the right it moves the viewport's **right** edge only, so there is nothing to compensate: `useContainerResize` reports the new size with `leftEdgeShift` at 0 and the camera is left alone. It still has to be measured before the paint, so the hook's `layoutKey` covers both panels' open flags. What it draws is per-type like the ObjectMenu: `PropertyPanelRegistry` holds each type's sections (declared as `propertyPanel`, or derived from `features` by `createDefaultPropertyPanel`), and the selection's sections are the ones every selected type offers — `mergeSectionsByKey`, shared with `useMenuSections`, down to the individual row. The connector is the one core type that states its sections by hand rather than deriving them: its Line section ends with a routing row (orthogonal / straight, the sidebar twin of the ObjectMenu's RoutingMenu) and a button that hands the route back to the engine (`resetConnectorRoute`, disabled rather than hidden while the route carries no hand-placed vertices) and it adds two sections for its label — Label for the text and face, Label border for the outline, apart the way a shape's Text and Border are so that a "Width" or "Color" row says which it states — both carrying `isShown` so the headings appear only once the label has text; every row of them would otherwise draw nothing under a standing heading. While nothing is selected it shows a "Canvas" section in place of the per-type ones, editing the document's own settings (`background`); those writes reach the reducer as `DOCUMENT_PROPERTY_UPDATE`. One section is the panel's own rather than any type's: "Arrange" holds the stacking-order commands as named buttons, appended after the per-type sections whenever `isArrangeableSelection` says so (the same test that shows the ObjectMenu's stack-order flyout), so a connector or a plugin type gets it without declaring it.

### Per-canvas registries (`CanvasConfig`)

These registries are **not module-level singletons**. Each `<Canvas>` instance owns its own **bundle** (`CanvasRegistries` — one instance of each registry class), built by `controllers/registries/createCanvasRegistries(config?)`. This lets two canvases on the same page run with different object-type / command sets (plugin-style extensibility, feature-gating). Passing no `config` reuses a shared full default (`defaultCanvasRegistries`).

```ts
<Canvas initialConfig={{ objectTypes: ["rect", "ellipse"], commands: ["undo", "redo"] }} />
```

`initialConfig` is read **once at mount** — the capability set is part of a canvas's identity, so later `initialConfig` changes are ignored. To reconfigure at runtime, remount with a new React `key`.

The bundle reaches consumers by two paths (#165, Option B):

- **React tree** (components / hooks) → `CanvasRegistriesContext` + `useCanvasRegistries()`. The rendering-layer `ObjectComponentRegistryContext` distributes just the component registry to renderers (the rendering layer must not import the control layer's bundle type).
- **Pure reducer/handler/util tree** (cannot read React context) → the bundle is **not** stored on `CanvasControllerState` (it is a dependency, not state). `createCanvasReducer(registries)` closes over it and threads it to each handler/command as an explicit `registries` argument (`handleGesture(state, gesture, registries)`, `command.execute(state, registries)`, …). Leaf utils without `state` receive the specific sub-registry as an argument.

`controllers/registries/initializeObjectRegistry(registries)` / `initializeGestureHandlerRegistry(registries)` / `initializeCommands(registries, commandIds?)` populate a **given** bundle; `createCanvasRegistries` wires them together (all object types by default, or the `config` subset). The doc-validator registry is the **exception**: it lives entirely in `@jiscribe/doc`, built per parser by `createCanvasParser` from the definition set it is given, because it is used only during parse-time validation at the input boundary (before a `<Canvas>` exists) and the headless package must pull in no UI dependency — see [Data Model](./03-data-model-and-persistence.md).

> **Semantic caveat**: when `config.objectTypes` restricts the enabled types, the caller must only pass docs whose object types remain enabled. A doc containing a disabled type makes `canvasToState` throw `"Mapper not found"` — consistent with the "caller passes a valid, consistent doc" contract ([design philosophy](./01-design-philosophy.md) principle 4). The default config (all types) is backward compatible.

> **On `CanvasMapper`**: whole-document `CanvasDoc ↔ CanvasState` conversion must invoke each shape's Mapper polymorphically, so `states/canvas/CanvasMapper.ts` takes an `ObjectMapperRegistry` argument (`canvasToState(doc, mapper)` / `canvasToDoc(state, mapper)`) rather than reaching for a global — the caller passes the canvas's own `registries.objectMapper` (the bundle threaded through the pure tree, e.g. `createInitialControllerState`). `ObjectMapperRegistry` is the only registry the `states/` layer depends on (colocated with the mappers it serves), so this is not a cross-layer exception.

## Dependency Graph

For a Jiscribe version (layers drawn as frames, easier to read), see [02-architecture.jis.json](./02-architecture.jis.json).

```mermaid
graph TD
    subgraph Controllers["Control Layer"]
        Gestures["gestures/handlers (+ registry/ · ObjectBehaviorEntry)"]
        Behaviors["behaviors (moveByDelta / transformByGroup / rotateByGroup)"]
        Commands["commands (+ CommandRegistry)"]
        Reducer["reducer"]
        UI["ui (+ menu / controls / Stencil types)"]
        CtrlUtils["utils"]
        Registries["registries (applyObjectDefinition wires definitions into all registries)"]
    end
    subgraph Rendering["Rendering Layer"]
        RenderingComponents["React Components"]
        RenderingUtils["utils (connector endpoint resolution / orthogonal routing, etc.)"]
        RenderingRegistryTypes["registry contracts (component / textRegion / outline)"]
    end
    subgraph States["Data Layer"]
        StatesTypes["states/ (State types + Mapper + ObjectMapperRegistry)"]
        DocPackage["@jiscribe/doc (Doc types + validation + ObjectDocValidatorRegistry)"]
    end
    subgraph Plugin["Extension Seam (plugin)"]
        PluginVocab["ObjectTypeDefinition&lt;TDoc,TState&gt; / defineObject / CanvasPlugin"]
    end

    RenderingComponents --> StatesTypes
    RenderingUtils --> StatesTypes
    Gestures --> StatesTypes
    Behaviors --> StatesTypes
    Commands --> StatesTypes
    Reducer --> StatesTypes
    UI --> StatesTypes
    CtrlUtils --> StatesTypes
    Registries --> StatesTypes
    Gestures --> RenderingUtils
    CtrlUtils --> RenderingUtils
    UI --> RenderingUtils
    UI --> RenderingComponents
    UI --> RenderingRegistryTypes
    Registries --> RenderingComponents
    Registries --> RenderingRegistryTypes
    StatesTypes --> DocPackage

    %% plugin aggregates the type contract of every layer; registries consumes it.
    %% Registries -> Plugin plus Plugin -> Gestures/UI = controllers <-> plugin.
    Registries --> Plugin
    Plugin --> Gestures
    Plugin --> UI
    Plugin --> RenderingRegistryTypes
    Plugin --> StatesTypes
    Plugin --> DocPackage
```

Direct references to `@jiscribe/doc` types/constants (`EndpointRef`, `AUTO_COLOR`, …) and to `theme/` (the `theme` token object) exist from nearly everywhere, so they are omitted from the graph.

**On `plugin` (the extension seam)**: `plugin/` holds the declarative vocabulary a shape/plugin author writes — `ObjectTypeDefinition<TDoc, TState>`, `defineObject`, `CanvasPlugin`. One definition **aggregates the type contract of every layer** (mapper/state from `states`, doc/features/factory from `@jiscribe/doc`, `ObjectBehaviorEntry` from `gestures/registry`, menu/controls/`Stencil` from `ui`, component/textRegion/outline contracts from `rendering`), so `plugin` depends on all three layers of this package plus the doc package. Conversely `controllers/registries` depends on `plugin` to build the built-in record (`defineObject`) and apply it (`applyObjectDefinition` → the registries). At the subgraph level this is a **`controllers ⇄ plugin` mutual reference** — the arrows above cross the Controllers boundary in both directions.

It is deliberately **not** a concrete import cycle: `plugin` pulls only leaf _type_ modules (`ObjectBehaviorTypes` / `SelectionControlTypes` / `ObjectMenuTypes` / `ObjectTextEditOverflowTypes` / `Stencil`), while the files that consume `plugin` (`registries/initializeObjectRegistry` and friends) are different files that none of those leaf modules import back. So madge `dep:check` stays green even though the folders reference each other. Keeping `applyObjectDefinition` (the runtime wiring) in `registries` rather than `plugin` is what preserves this: `plugin` never imports the concrete registries.

The dependency direction is also enforced in CI (madge `dep:check`, see [Testing](./09-testing.md)).

## Steps to Add a New Shape

Thanks to the Registry pattern, adding a shape is completed in "6 steps + registration."

1. **Doc**: `@jiscribe/doc`'s `model/objects/primitives/<shape>/<Shape>Doc.ts` (+ `validate<Shape>Doc.ts`, `<Shape>ObjectFactory.ts`)
2. **State**: `states/objects/primitives/<shape>/<Shape>State.ts`
3. **Mapper**: `states/objects/primitives/<shape>/<Shape>Mapper.ts` (Doc ↔ State)
4. **Controller**: `controllers/behaviors/primitives/<Shape>Controller.ts` (`moveByDelta` / `transformByGroup`)
5. **Component**: `rendering/objects/primitives/<Shape>/<Shape>.tsx`
6. **Registration**: Register it in **both** registration paths, because they populate different registry sets:
   - `controllers/registries/initializeObjectRegistry.ts` — mapper / component / behavior / state validator / menu (the UI-side registries)
   - `@jiscribe/doc`'s `plugin/builtinObjectDocDefinitions.ts` — the Doc validator. **Do not forget this one**: it feeds a separate registry that `createCanvasParser` builds inside the doc package, so a shape missing here is stripped by the parser as an unknown type even though the UI works.

Without adding branches to existing logic, the shape joins cross-shape processing (transform, snap, rendering) simply by being registered.

## Design Prohibitions

- ❌ `states → controllers` (state definitions must not depend on logic)
- ❌ `@jiscribe/doc → states` (persistence types must not depend on runtime types; the package dependency runs canvas → doc only)
- ❌ `rendering → controllers` (the rendering layer sits below the control layer; it must not depend on the control logic above it)
- ❌ Recursive processing in a Mapper (a Mapper converts only its own properties; conversion of child elements is managed centrally by `CanvasMapper`)
- ❌ Shape discrimination in an EventHandler (avoid `if (type === "rect")`; resolve via the Registry)
