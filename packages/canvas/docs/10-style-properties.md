> 🌐 日本語版: [10-style-properties.ja.md](./10-style-properties.ja.md)

# Style Property System

The mechanism that resolves and applies styleable property updates (fill, stroke,
fontSize, headerFill, `label.*`, …) issued from the ObjectMenu. Introduced by #187 to
replace the former central `switch` (`handlePropertyUpdate`) with per-canvas
declarations: a new property is added by **registering a declaration**, not by editing
a dispatch function.

## Flow: two entry routes converge on one registry

```
ObjectMenu item / slider   ── gesture (set:/slider:) ─→ ObjectMenuHandler ┐
ObjectMenu number input    ── MENU_PROPERTY_UPDATE ──→ canvasReducer      ┼─→ registries.styleProperty.apply(state, property, value)
                                                                          ┘        │
                                                             StylePropertyRegistry │
                                                    handlers.get(property) ?? extraFallback
                                                                                   │
                                                          handler.apply(...) ⇒ new state
```

The slider straddles both: pointer interaction (drag and track click) rides the
gesture route, while keyboard interaction (arrow keys and the like) produces no
gesture and so goes through `MENU_PROPERTY_UPDATE`.

Both routes hand the property name and the raw string value from the UI to
`StylePropertyRegistry.apply`; everything property-specific — support gating, value
coercion, write path — lives in the resolved handler.

## StylePropertyHandler: one method, dependencies via constructor

```ts
interface StylePropertyHandler {
	/** Applies the update to the current selection. Returns `state` as-is when nothing applies. */
	apply(state, property, value): CanvasControllerState;
}
```

The interface is deliberately a single method. Handlers that need collaborators
(e.g. the extras lookup) receive them via constructor injection, keeping the
dispatch surface uniform.

Class hierarchy (`controllers/styleProperties/`):

| Class                       | Role                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SelectionStyleProperty`    | Abstract base with the shared pipeline: connector branch / selection loop / group-descendant recursion → per-object gate & type resolution → coercion → write |
| `FeatureGatedStyleProperty` | Standard system property. Applies to objects whose `ObjectFeatures` flag `gate` is on; `(gate, valueType)` constructor args are the whole declaration         |
| `ExtraStyleProperty`        | Fallback for unregistered names: an object supports the property iff its type declares it (fail-closed)                                                       |
| `LockAspectRatioProperty`   | Special routing: with a multi-selection writes to the `multiSelectGroup` itself, and never recurses into descendants                                          |

Special behavior lives in the special property's own class — the shared base and the
registry know nothing about individual properties.

## Two declaration layers

**System properties** (`styleProperties/systemStyleProperties.ts`) — the closed set
tied 1:1 to `ObjectFeatures` flags, registered into every bundle at creation
(`registries/initializeStyleProperties`):

```ts
export const SYSTEM_STYLE_PROPERTIES: Record<string, StylePropertyHandler> = {
	fill: new FeatureGatedStyleProperty("fill", "string"),
	strokeWidth: new FeatureGatedStyleProperty("stroke", "number"),
	// … 15 entries
	lockAspectRatio: new LockAspectRatioProperty(),
};
```

**Shape-specific properties** — properties that do not belong on `ObjectFeatures`
(e.g. connector's `label.*`, or the container plugin's `headerFill`). Declared next
to the shape's Doc and wired through its `ObjectTypeDefinition`. Example from the
container plugin (`plugins/container-shapes`, where the shape now lives):

```ts
// plugins/container-shapes/src/schema/ContainerDoc.ts — next to `headerFill?: string`
export const ContainerExtraStyleProperties = {
	headerFill: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// plugins/container-shapes/src/definition.ts
export const containerDefinition = defineObject({
	features: ContainerFeatures,
	extraStyleProperties: ContainerExtraStyleProperties,
	// …
});
```

The declaration's existence **is** the gate: no separate flag, and a property nobody
declares applies to nothing (fail-closed). Because registration flows through
`applyObjectDefinition`, plugin/custom shapes added via `CanvasConfig.plugins`
(see [Plugin Architecture](./12-plugin-architecture.md)) get the same capability, and
`initializeObjectRegistry`'s clear cycle clears only the per-type extras
(`clearExtras`) — system handlers are canvas-wide, like gesture handlers and
commands.

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
`handleGesture`'s end-of-event choke point; the `MENU_PROPERTY_UPDATE` route, which
bypasses `handleGesture`, materializes right after `apply` (one-shot pattern, same
as `MoveCommands`).

## Adding a property

| Case                                          | What to write                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| New system property gated by an existing flag | One row in `SYSTEM_STYLE_PROPERTIES`                                                                                                             |
| New shape-specific property                   | One entry in the shape's `…ExtraStyleProperties` (plus `extraStyleProperties` in its definition, first time only)                                |
| Property needing special routing              | Implement `StylePropertyHandler` (usually by extending `SelectionStyleProperty`) and register it — reserved for lockAspectRatio-class exceptions |

Regression safety: `styleProperties/__tests__/stylePropertyRegistry.test.ts` is
registry-driven — it enumerates the real bundle wiring and verifies gate/coercion/
application for every declared property, plus consistency (extras must not shadow
system names; shapes declaring the same name must agree on `valueType`). A new
declaration is covered automatically.
