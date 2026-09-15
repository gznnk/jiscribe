> 🌐 日本語版: [10-style-properties.ja.md](./10-style-properties.ja.md)

# Style Property System

The mechanism that resolves and applies styleable property updates (fill, fillOpacity,
stroke, strokeOpacity, fontSize, headerFill, `label.*`, …) issued from the ObjectMenu and the properties
sidebar. Introduced by #187 to
replace the former central `switch` (`handlePropertyUpdate`) with per-canvas
declarations: a new property is added by **registering a declaration**, not by editing
a dispatch function.

## Flow: two entry routes converge on one registry

```
ObjectMenu item / slider, sidebar swatch ── gesture (set:/slider:) ─→ ObjectMenuHandler   ┐
ObjectMenu number input, sidebar callback ── STYLE_PROPERTY_UPDATE ──→ canvasReducer      ┼─→ registries.styleProperty.apply(state, property, value)
                                                                                          ┘        │
                                                                             StylePropertyRegistry │
                                                                    handlers.get(property) ?? extraFallback
                                                                                                   │
                                                                          handler.apply(...) ⇒ new state
```

The slider straddles both: pointer interaction (drag and track click) rides the
gesture route, while keyboard interaction (arrow keys and the like) produces no
gesture and so goes through `STYLE_PROPERTY_UPDATE`.

Both routes hand the property name and the raw string value from the UI to
`StylePropertyRegistry.apply`; everything property-specific — support gating, value
coercion, write path — lives in the resolved handler.

## StylePropertyHandler: one method, dependencies via constructor

`StylePropertyHandler` (`controllers/styleProperties/StylePropertyHandler.ts`) has a
single method, `apply(state, property, value)`: it applies the update to the current
selection and returns `state` as-is (same reference) when nothing applies.

The interface is deliberately a single method. Handlers that need collaborators
(e.g. the extras lookup) receive them via constructor injection, keeping the
dispatch surface uniform.

Main classes (the full set is in `controllers/styleProperties/`):

| Class                       | Role                                                                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectionStyleProperty`    | Abstract base with the shared pipeline: connector branch / selection loop / group-descendant recursion → per-object gate & type resolution → coercion → write                                                                                               |
| `FeatureGatedStyleProperty` | Standard system property. Applies to objects whose `ObjectFeatures` flag `gate` is on; `(gate, valueType)` constructor args are the whole declaration                                                                                                       |
| `TextSlotStyleProperty`     | Text styling (fontSize / textAlign, …). Applies to objects that hold text (`features.text`) and writes per slot: the selected slot when there is one, otherwise every slot, and only the selected characters while an editor has a stretch of text selected |
| `ExtraStyleProperty`        | Fallback for unregistered names: an object supports the property iff its type declares it (fail-closed)                                                                                                                                                     |
| `LockAspectRatioProperty`   | Special routing: with a multi-selection writes to the `multiSelectGroup` itself, and never recurses into descendants                                                                                                                                        |

Special behavior lives in the special property's own class — the shared base and the
registry know nothing about individual properties.

## Two declaration layers

**System properties** (`SYSTEM_STYLE_PROPERTIES` in `styleProperties/systemStyleProperties.ts`)
— the closed set of styling every shape shares. Its keys are bound by `SystemStyleName` in
the same file: the union of the keys the style groups of `@jiscribe/doc` declare
(`*_STYLE_KEYS`), plus `text` and `lockAspectRatio`. Every key needs a handler, and a name
none of them owns cannot be registered. What gates support differs per handler (an
`ObjectFeatures` flag, whether the object holds text, …). The handlers are stateless, so
they are shared by every canvas and registered into each canvas's registry when its bundle
is created (`registries/initializeStyleProperties`).

A handler bound to one of the canvas's own registries is registered by the same function
outside `SYSTEM_STYLE_PROPERTIES`, one instance per canvas (e.g. `TextVerticalBasisProperty`
for `textVerticalBasis`).

**Shape-specific properties** — properties that do not belong on `ObjectFeatures`
(e.g. connector's `label.*`, or the container plugin's `headerFill`). Declared as
`…ExtraStyleProperties` next to the shape's Doc and wired through the
`extraStyleProperties` of its `ObjectTypeDefinition`. For example, the container plugin
(`plugins/container-shapes`) declares `ContainerExtraStyleProperties` in
`src/schema/ContainerDoc.ts`, and `src/definition.ts` hands it to
`createFrameObjectDefinition` from `@jiscribe/canvas-sdk` as `extraStyleProperties`.
Connector's declaration is in `model/objects/connector/ConnectorDoc.ts` of `@jiscribe/doc`.

The declaration's existence **is** the gate: no separate flag, and a property nobody
declares applies to nothing (fail-closed). Because registration flows through
`applyObjectDefinition`, plugin/custom shapes added via `CanvasConfig.plugins`
(see [Plugin Architecture](./12-plugin-architecture.md)) get the same capability. The
extras are registered per canvas bundle from each type's definition, while system handlers
sit on every canvas regardless of type, like gesture handlers and commands.

The two opacities (`fillOpacity`, `strokeOpacity`) are gated by the same `fill` and
`stroke` flags their colors are. The document states them as 0..1; the properties
sidebar states the same value in percent and converts on both sides
(`PropertyPanel/utils/opacityPercent.ts`), so what reaches the handler is the 0..1
value either way.

## Dot notation = generic nested writes

A dot in the property name is a write path: `"label.fill"` merges into
`connector.label.fill` immutably. The rule is **merge into existing parents, never
fabricate them** — if an intermediate parent is missing (a connector without a
label), the update is a no-op for that object. This replaced the former
connector-only `label.*` special case; see
[Data Model](./03-data-model-and-persistence.md) for why labels are nested.

Value coercion is declared per property (`valueType: "string" | "number" | "boolean"`)
and applied per object; a failed number parse skips that object.

## Performance: copy-on-write like every other objects writer

Slider drags call `apply` once per pointermove frame, so the selection loop uses the
#213 `createCowObjects` view (O(changed) instead of an O(all objects) map spread).
Materialization follows the standard split: the gesture route is flattened at
`handleGesture`'s end-of-event choke point; the `STYLE_PROPERTY_UPDATE` route, which
bypasses `handleGesture`, materializes right after `apply` (one-shot pattern, same
as `MoveCommands`).

## Adding a property

| Case                                          | What to write                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New system property gated by an existing flag | A key in the doc's style group (`*_STYLE_KEYS`; a name no group owns goes into `SystemStyleName` directly) plus one handler row in `SYSTEM_STYLE_PROPERTIES`. The keys are bound by `SystemStyleName`, so either one alone does not compile |
| New shape-specific property                   | One entry in the shape's `…ExtraStyleProperties` (plus `extraStyleProperties` in its definition, first time only)                                                                                                                           |
| Property needing special routing              | Implement `StylePropertyHandler` (usually by extending `SelectionStyleProperty`) and register it (in `initializeStyleProperties` when it is bound to a canvas registry) — reserved for lockAspectRatio-class exceptions                     |

Regression safety: `styleProperties/__tests__/stylePropertyRegistry.test.ts` is
registry-driven — it enumerates the `FeatureGatedStyleProperty` entries of
`SYSTEM_STYLE_PROPERTIES` and every shape-specific declaration in the real bundle
wiring, and verifies gate/coercion/application, plus consistency (extras must not shadow
system names; shapes declaring the same name must agree on `valueType`). A new
declaration of either kind is covered automatically.
