> 🌐 日本語版: [12-plugin-architecture.ja.md](./12-plugin-architecture.ja.md)

# Plugin Architecture

How a shape lives outside the engine. Every shape beyond the eight primitives
(`rect` / `ellipse` / `text` / `polyline` / `polygon` / `group` / `connector` /
`svg`) ships as a plugin under `plugins/`, written against the same public API a
third party would use. If the shipped shapes can be written that way, so can yours.

This document covers the contract. For the practical steps — package layout, the
authoring kit, the wiring checklist — see
[Authoring Plugins](./13-authoring-plugins.md).

## A plugin is a bundle of contributions

There is no plugin runtime. A plugin is a declaration of what to register, and the
engine's registries are the same ones the built-in types go through.

```ts
export type CanvasPlugin = {
	id: string;
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;
};
```

A host wires it in through `initialConfig`:

```tsx
<Canvas doc={doc} initialConfig={{ plugins: [stickyPlugin, umlPlugin] }} />
```

`objects` is keyed by `ObjectType`, and the value carries everything the engine
needs for that type: `mapper`, `stateValidator`, `component`, `behavior` and the
optional calculators (`outline`, `textRegion`, `geometryKey`, `visualBounds`,
`anchorRegion`, `extraConnectPoints`), plus `stencils`, `menu`, `propertyPanel`,
`svgDefs`,
`selectionControls`, `transformHandles` and `extraStyleProperties`. Nothing in the
engine branches on the type — everything is resolved through an `ObjectType`-keyed
registry, so a plugin type is indistinguishable from a built-in one at runtime.

`Partial<Record<...>>` rather than a plain `Record` matters: `ObjectType` is an open
union, and a plugin that contributes one shape must be able to omit the rest.

## The two halves: UI and headless

A plugin exports its contributions twice, through two entry points.

| Entry   | Exports                         | Consumers                                            |
| ------- | ------------------------------- | ---------------------------------------------------- |
| `.`     | `CanvasPlugin` (UI definitions) | `<Canvas>` hosts                                     |
| `./doc` | `CanvasDocPlugin`               | `createCanvasParser`, Node tools, VSCode diagnostics |

```ts
export type CanvasDocPlugin = {
	id: string;
	objects?: Readonly<Partial<Record<ObjectType, ObjectDocDefinition>>>;
};
```

`ObjectDocDefinition` is the headless half of a type: `features`, `validateDoc`,
`factory`, plus the AI-facing `description` / `summary` / `outlineDescription` /
`defaults`. `ObjectTypeDefinition` extends it, which is why a full `CanvasPlugin` is
**structurally assignable** to `CanvasDocPlugin` — one `plugins` array feeds both
`<Canvas>` and the parser.

The split exists so a consumer that only validates documents never loads React.
The VSCode extension's diagnostics provider and the MCP server both parse
`.jis.json` in a Node process; importing a plugin's `.` entry would drag React,
`@emotion` and the whole rendering layer into their bundle. So plugins keep
`./doc` free of them, and ESLint enforces it (see
[Authoring Plugins](./13-authoring-plugins.md#boundaries-the-linter-enforces)).

The parser is instantiated per configuration:

```ts
const parser = createCanvasParser({ plugins: [stickyDocPlugin, umlDocPlugin] });
const result = parser.parse(text);
```

`presetDefinitions` defaults to `builtinObjectDocDefinitions`, the record of every
built-in type. To replace a built-in with your own, pass a `presetDefinitions` with
that type filtered out and add yours through `plugins`. Calling `createCanvasParser()`
with no config gives the default configuration: every built-in type and nothing else.

## Lifecycle and conflict rules

- **Applied once at mount, immutable afterwards.** `initialConfig` is read-once;
  changing the plugin set means remounting with a new React `key`. Dynamic
  enable/disable is a non-goal: a document can contain objects of a type that was
  just unregistered, and there is no coherent answer for what should happen to them.
- **Merge order** is `presetDefinitions` → `plugins` in declaration order.
- **A duplicate type throws at construction.** Not last-wins — an accidental
  collision between two plugins fails loudly instead of silently changing which
  shape renders. Deliberate replacement is expressed as removal plus addition.
- Adding plugins does not move the validation boundary: the parser remains the one
  place documents are checked, and everything past it assumes valid input
  ([Design Philosophy](./01-design-philosophy.md)).

## The public surface and its tiers

```
@jiscribe/canvas              stable: type vocabulary, registration, Canvas props
@jiscribe/doc                 stable, headless: the document model, parser and doc ops
@jiscribe/canvas/unstable     tier 2: base implementations, presentation parts
@jiscribe/doc/unstable        tier 2, headless
@jiscribe/canvas-sdk          the plugin-facing surface (re-exports unstable + kit)
@jiscribe/canvas-sdk/doc      headless counterpart
```

The two headless entries are a package of their own. `@jiscribe/canvas` keeps
`./doc` and `./unstable-doc` as re-export shims onto them, so the plugins and Node
tools that name the canvas paths — which is what ESLint still points them at — go on
working unchanged.

The `unstable` subpaths carry the frame-family base implementations and the
presentation parts that shapes are built from. They are outside the semver
guarantee, and the import path says so at every call site.

**Plugins never import them directly.** `@jiscribe/canvas-sdk` re-exports the whole
of `unstable` and adds the parts only plugins use, so it is the single supported
surface for shape authoring — and the one place to look when deciding what a plugin
is allowed to depend on. ESLint rejects `@jiscribe/canvas/unstable` from
`plugins/*/src/**`.

## State ownership: uncontrolled, with handles

The canvas owns its state. Hosts read through subscriptions and write through an
imperative handle on the `ref`:

```tsx
const canvasRef = useRef<CanvasHandle>(null);

canvasRef.current?.viewport.setViewport(next);
canvasRef.current?.selection.select(ids);
await canvasRef.current?.export.toSvgString();
```

The handle also reads back what the canvas made of the document — the part no
`CanvasDoc` holds: `measure` (how a text wrapped and whether it still fits, what
a shape draws outside its box, the route a connector took, which shapes overlap,
what is drawn at a point), `history` (the undo stack, with `mark` / `revertTo` to
roll a whole batch of edits back), and `interaction` (whether the user is
mid-gesture, which is when an external write would be destructive). Editing the
document itself needs no canvas and belongs to `createDocOps` in the headless
`@jiscribe/doc`.

Lifting state into the host (controlled props) was considered and rejected:

1. **It fights the performance model.** `CanvasState` updates every frame during a
   drag, batched on RAF. Routing that through host state makes rendering
   performance a property of the host's implementation — the API would be slow when
   used the obvious way.
2. **There is a worked example of the failure.** The viewport was controlled once
   and oscillated; splitting it into an imperative `setViewport` plus an observed
   `onViewportChange` fixed it. Controlling everything reintroduces that class of
   bug across the board.
3. **It fixes the entire internal shape as public contract.** `CanvasState` includes
   transient fields such as the gesture-start snapshot. A handle exposes a chosen
   set of verbs and keeps the representation private, so encapsulation is stronger,
   not weaker.

The distinction is between state and commands: declarative props suit steady state,
while one-shot transitions (change the selection, apply a patch, undo) suit
commands. Placing an imperative façade at an engine boundary is the common shape —
tldraw's `Editor`, Excalidraw's `excalidrawAPI`, a React Flow instance, CodeMirror's
`EditorView`.

Guardrails that keep the handle from decaying into a state dump:

- Keep the vocabulary to a few domain verbs. Do not grow getters for internal state,
  which would be state exposure with none of the benefits.
- Implement every method as a dispatch to the existing reducer. No side channel
  around the pure state transitions.
- Return reads through subscriptions, so only the write path is imperative.
- Document each method's effect on history and commit boundaries as part of the
  contract.

## Conventions a plugin must follow

**Type ids.** `ObjectType` is an open union. Prefix a vendor namespace
(`vendor:shape`) if the shape is not meant to be a candidate for the shared
vocabulary — a duplicate id against a built-in or another plugin throws.

**`svgDefs`.** Filters, gradients and markers referenced through `url(#…)` are
declared on the definition and rendered into the canvas-wide `<defs>` **once per
type**, even when zero objects of that type exist, so the reference target never
disappears. SVG ids are document-global and the registry cannot scope them, so
**prefix the id with the type name** (`sticky-shadow`). Hosts that narrow
`objectTypes` drop the corresponding `svgDefs` too. Export clones the live SVG, so
plugin-provided defs are included automatically.

**Text slots** (`features.text: "slots"`). Do not use integer-like slot ids
(`"0"`, `"1"`). JavaScript enumerates integer-like own keys in ascending numeric
order before insertion order, so the key order of `state.text` — which decides the
default slot for Enter-to-edit and the render order — would stop reflecting the
shape's intent. `mapTextDocToState` drops such keys, so they never reach state.

**`menu`.** Optional, with three meanings: omitted derives the default menu from
`features`; a declared array replaces it entirely; `[]` means no menu. The
derivation rules are defined by `createDefaultMenu` and its unit tests.

**`propertyPanel`.** The properties sidebar's sections, with the same three
meanings: omitted derives them from `features`; a declared array replaces them
entirely; `[]` means no sections. The derivation rules are defined by
`createDefaultPropertyPanel` and its unit tests. A declaration composes the
built-in row kinds and, where none of them fits, rows of the type's own.

**`propertyPanel` custom rows.** A row a plugin draws itself is
`{ type: "custom"; id; component }` among the built-in ones, the same shape the
ObjectMenu's custom item has. What the component receives is
`PropertyPanelItemProps` and nothing else: `objects`, `selectedIds`,
`selectedConnectorId`, `multiSelectGroup`, plus `onPropertyUpdate` for a style
property and `onTransformUpdate` for one of the frame's five numbers — never the
controller state the built-in rows read. What it may import is the properties
sidebar UI kit published through `@jiscribe/canvas/unstable` (and so through
`@jiscribe/canvas-sdk`): `PropertyRow` for the label column every row shares,
`PropertyNumberField` / `PropertyColorField` / `PropertyDropdownField` /
`PropertySegmentedControl` for the control beside it, and `PropertyCheckbox`,
which is a row of its own (the box with its label to the right, from the
section's left edge). Two rules to know before writing one:

- The `id` is what the multi-type merge matches the row by, so two types offering
  the same row must spell it the same way; a selection mixing types that spell it
  differently drops it, exactly as a built-in kind only one of them offers is
  dropped.
- Custom rows are dropped while a text slot is selected, since a plugin row has
  no way to say it is slot-aware — the same rule the ObjectMenu applies to its
  custom items.

`plugins/container-shapes` is the worked example: its `header-fill` row states
`headerFill` through `onPropertyUpdate` from a `PropertyColorField`, sitting under
the body color in the Fill section, and its `header-height` row states the
`headerHeight` extra style property from a `PropertyNumberField` under the size in
the Layout section; both take their wording from the plugin's own dictionary.

**i18n.** A plugin owns its dictionary and resolves it through `useCanvasLocale` /
`resolveLocaleMessages`. Plugin vocabulary is never added to the core message keys.

**`selectionControls`.** A plain declaration, `{ name, Component, handle }` — no base
class. `handle` receives the object's own information (current frame plus the
gesture-start snapshot) and the cursor, and nothing else; part derivation, snapshot
guarding, copy-on-write write-back and edge-scroll release are handled by an
internal adapter.

## What is not extensible yet

Honest limits, so you do not design against something that is not there.

| Area                             | Current state                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built-in UI                      | Toolbar / ObjectMenu / ContextMenu mount unconditionally; there is no way to hide or replace them                                                                                         |
| UI slots                         | Only `toolbar.leading` / `toolbar.trailing`. No slot for an overlay layer; the properties sidebar takes a component only as a row of a section a type declares, not as a panel of its own |
| Fine-grained property write-back | The handle has no `updateProperties`. Replacing the `doc` prop is treated as an external change: it resets the selection and cuts the history boundary, so it is not an editing path      |
| Interaction tuning               | Snap thresholds and similar constants are hardcoded. Edge scrolling and pan/zoom cannot be disabled from outside                                                                          |
| Commands                         | `config.commands` can narrow the built-in set, but a plugin cannot contribute a command or rebind a shortcut                                                                              |
| ObjectMenu item kinds            | The built-in kinds are a fixed switch; only `custom` component items are data-driven                                                                                                      |
| Properties sidebar item kinds    | The built-in kinds are a fixed lookup; only `custom` component rows are data-driven, and one cannot say it is text-slot-aware                                                             |

What _is_ fully available: adding shape types with their own doc schema, validation,
rendering, stencils, menus, properties-sidebar sections, style properties,
outline/snap behaviour, type-specific
selection controls, shared SVG defs, and their own i18n — all from an external
package.
