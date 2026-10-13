import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { ObjectDocDefinition } from "@jiscribe/doc/plugin/ObjectDocDefinition";
import type { FC } from "react";

import type { ObjectBehaviorEntry } from "../controllers/gestures/registry/ObjectBehaviorTypes";
import type { DeclaredStyleTable } from "../controllers/style/StyleEntry";
import type { ObjectTransformHandlesDeclaration } from "../controllers/ui/controls/ObjectTransformHandlesRegistry";
import type { SelectionControlDefinition } from "../controllers/ui/controls/SelectionControlTypes";
import type { ObjectTextEditOverflowResolver } from "../controllers/ui/editors/ObjectTextEditOverflowTypes";
import type { ObjectMenuSection } from "../controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
import type { PropertyPanelSection } from "../controllers/ui/menu/PropertyPanel/PropertyPanelTypes";
import type { Stencil } from "../controllers/ui/objects/Stencil";
import type { ObjectAnchorRegionCalculator } from "../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectConnectionAnchorOffsetsDeclaration } from "../rendering/objects/registry/ObjectConnectionAnchorOffsetsRegistry";
import type { ObjectExtraConnectPointsCalculator } from "../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyCalculator } from "../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineCalculator } from "../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectPartKindDefinition } from "../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectVisualBoundsCalculator } from "../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectMapperType } from "../states/objects/base/MapperTypes";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ObjectContentResizer } from "../states/registry/ObjectContentResizerRegistry";
import type { ObjectStateValidator } from "../states/registry/ObjectStateValidatorRegistry";

/**
 * The full description of a single object type: the headless
 * {@link ObjectDocDefinition} (features / validateDoc / factory) intersected with
 * the UI-layer contracts (render / interaction / style / editor UI). Fields are
 * grouped in that order below; required first within each group. Because it
 * extends {@link ObjectDocDefinition}, a UI definition is structurally a doc
 * definition, and `CanvasPlugin.objects` flows into `createCanvasParser` unchanged.
 *
 * The inherited `textRegion` is the doc's, for the headless checks and the
 * auto-height verdict; it is not where the canvas draws the text. That is the
 * `"textSlot"` part kind's `region` / `regions` (createTextSlotPartKindDefinition
 * in `partKinds`, or `createFrameObjectDefinition({ textRegion })`), since a doc
 * declaration may answer "the box does not hold the text at all" (`null`), which
 * a renderer has no use for. Most shipped shapes declare the very same function
 * on both sides; the ones that cannot are those whose region is sized from the
 * text itself (a below-label caption, a record's bands).
 *
 * `TDoc` / `TState` tie `mapper` / `behavior` / `selectionControls` to one state
 * type. A plugin declares a standalone definition with an explicit
 * annotation — `ObjectTypeDefinition<ContainerDoc, ContainerState>` — and needs no
 * `defineObject` call. The built-in record uses `defineObject` instead, because a
 * record literal can only be annotated with the widened entry type, which would
 * erase per-entry inference.
 */
export type ObjectTypeDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = ObjectDocDefinition & {
	// --- Model (state) ---

	/** Doc ↔ State conversion. */
	mapper: ObjectMapperType<TDoc, TState>;

	/** Type-guard that rejects untrusted State entering the canvas from outside (e.g. pasted clipboard data). */
	stateValidator: ObjectStateValidator;

	/**
	 * Re-derives the box from the content, for a type whose doc stores no size
	 * (`geometry: "point"`). Runs wherever content and box can drift apart: load,
	 * undo/redo, external sync, every committed and uncommitted edit. Omitted =
	 * no derivation, so the doc's own width/height stand as-is — which is what
	 * every stored-box geometry wants (see ObjectContentResizerRegistry).
	 */
	contentResizer?: ObjectContentResizer<TState>;

	// --- Rendering layer ---

	/** SVG renderer for the shape. Editable types read `isEditing` by self-declaring `FC<TState & TextEditable>`. */
	component: FC<TState>;

	/**
	 * Shared SVG resources (filter / gradient / marker / …) that `component`
	 * references by `url(#…)`. Rendered once per canvas inside the canvas-wide
	 * `<defs>`, regardless of how many objects of this type exist — including
	 * zero, so a reference never outlives its target. Element ids are
	 * document-global, so prefix them with this type's name (`sticky-shadow`) to
	 * stay clear of other types (see ObjectSvgDefsRegistry).
	 */
	svgDefs?: FC;

	/**
	 * Whether the in-place editor scrolls inside a slot's region or grows past it,
	 * to the shape's bottom edge at most. Only a slot whose region is derived
	 * from the text itself may grow. Omitted = `"scroll"` for every slot (see ObjectTextEditOverflowRegistry).
	 */
	textEditOverflow?: ObjectTextEditOverflowResolver;

	/** Hit-test / snap outline. Omitted = bounding-box rect/ellipse (see ObjectOutlineRegistry). */
	outline?: ObjectOutlineCalculator;

	/** Band the edge connect points are centered on. Omitted = full bbox (see ObjectAnchorRegionRegistry). */
	anchorRegion?: ObjectAnchorRegionCalculator;

	/**
	 * Named connection points this type offers on top of the four edge midpoints
	 * every connectable shape has — the brace's `tip`, say. Each carries its own
	 * local position and outward direction, so a connector attaches there and
	 * leaves along it. Their ids are what a saved doc stores in
	 * `{ kind: "connectPoint", id }`, so they must stay stable. Omitted = edge
	 * midpoints only (see ObjectExtraConnectPointsRegistry).
	 */
	extraConnectPoints?: ObjectExtraConnectPointsCalculator;

	/**
	 * How far each connection-anchor dot shown on the selected shape sits off
	 * its edge (or off an extra point's declared position), for a type whose own
	 * controls occupy the band the dots would land in. Values are screen px,
	 * divided by zoom like the theme's `handleDimensions.connectionAnchorOffset`,
	 * which every anchor left out keeps. Keys are the edge anchor ids
	 * (`topCenter` / `rightCenter` / `bottomCenter` / `leftCenter`) and the ids
	 * `extraConnectPoints` declares — local-space ids, so an entry stays on its
	 * edge through rotation and flips. Moves only the dots: where a connector
	 * attaches is unchanged. One object for the whole type, or a function asked
	 * per object. Omitted = the theme's distance everywhere (see
	 * ObjectConnectionAnchorOffsetsRegistry).
	 */
	connectionAnchorOffsets?: ObjectConnectionAnchorOffsetsDeclaration<TState>;

	/**
	 * Key over whatever `outline` / `anchorRegion` / `extraConnectPoints` read beyond the frame fields
	 * (cx / cy / width / height / rotation / scaleX / scaleY), for the consumers
	 * that memoize connector endpoint resolution on those fields. Required for a
	 * type whose silhouette can change while the frame stands still (the callout's
	 * tail, in `@jiscribe/plugin-annotation-shapes`) — without it, connectors
	 * attached to the shape keep the
	 * endpoints resolved against the previous silhouette. Omitted = the frame
	 * fields fully determine the resolved geometry (see ObjectGeometryKeyRegistry).
	 */
	geometryKey?: ObjectGeometryKeyCalculator;

	/**
	 * Everything the type draws, including what falls outside its geometry box.
	 * Read by the visual-extent consumers only (zoom-to-fit, export viewBox,
	 * culling, menu placement) — selection and snapping keep using the geometry
	 * box. Omitted = geometry box (see ObjectVisualBoundsRegistry).
	 */
	visualBounds?: ObjectVisualBoundsCalculator;

	// --- Interaction (controllers) ---

	/** Group-transform ops (move / rotate / transform). */
	behavior: ObjectBehaviorEntry<TState>;

	/** Type-specific selection controls (handle renderer + gesture strategy pairs). */
	selectionControls?: SelectionControlDefinition<TState>[];

	/**
	 * The sub-parts of an object of this type that core may select and act on —
	 * one entry per part-id namespace (see ObjectPartKindRegistry). Omitted = the
	 * object is indivisible, and every part-aware seam is inert for it.
	 *
	 * A type with `features.text` gets the `"textSlot"` kind without declaring it,
	 * its slots taking the whole box. Declaring it here
	 * (createTextSlotPartKindDefinition) replaces that one, and its `region` /
	 * `regions` are where the slots are drawn, edited and outlined.
	 */
	partKinds?: ObjectPartKindDefinition<TState>[];

	/**
	 * Which handles the transform frame offers on a single selection. Omitted =
	 * every handle (eight resize handles + rotation knob), so leaving it out
	 * keeps the historical behavior. A function is asked per object, for a type
	 * whose objects do not all take the same handles, and must return one of a
	 * fixed set of values (see ObjectTransformHandlesRegistry). Affects the
	 * handles only — the selection outline, snapping and the bounding box are
	 * unchanged.
	 */
	transformHandles?: ObjectTransformHandlesDeclaration<TState>;

	// --- Style ---

	/**
	 * What this type answers for when a style is written or reported: an
	 * `{ apply, read }` pair per intent kind ({@link DeclaredStyleTable}). Composed onto
	 * the entries derived from `features` (`coreStyleTable`) at registration,
	 * these last — so a kind declared here **replaces** the derived one, which is
	 * how a type whose storage differs from the core guess (a table whose fill
	 * lives on its cells) says where the edit really lands.
	 *
	 * A kind the core vocabulary does not hold is a style of this type alone: it
	 * reaches the objects of the selection that declare it and no others, the
	 * declaration being the gate (fail-closed). `declaredFieldEntry(path,
	 * valueType)` is the entry for a field of the type's own, dots in the path
	 * being a write into a nested object. Every entry states the fields it writes
	 * (`fields`), `[]` when it writes nothing the document stores; an entry
	 * stating none, or a field the type's doc cannot hold (`extraKeys`), is
	 * refused at registration.
	 */
	styleEntries?: DeclaredStyleTable<TState>;

	// --- Editor UI (StencilLibrary / ObjectMenu) ---

	/**
	 * Stencils this type contributes to the palette (multiple allowed per type).
	 * Registration only makes them exist; where they show and in what order is
	 * decided by `toolbar.sections` (a pinned item, or a category's `presetIds`)
	 * and `stencilLibrary.sections` (a sidebar section's `presetIds`).
	 */
	stencils?: Stencil[];

	/**
	 * ObjectMenu sections for this type. Omitted = derived from features (see createDefaultMenu).
	 * Static per type; per-instance visibility belongs to the `custom` item component
	 * (return null and the emptied section collapses).
	 */
	menu?: ObjectMenuSection[];

	/**
	 * Properties-sidebar sections for this type. Omitted = derived from features
	 * (see createDefaultPropertyPanel); a declared array replaces it entirely;
	 * `[]` means no sections. Static per type; a row of the type's own goes in as
	 * a `custom` item (PropertyPanelCustomItem), and per-instance visibility
	 * belongs to that component (returning null leaves the row out, though the
	 * section's own header stays).
	 */
	propertyPanel?: PropertyPanelSection[];
};

/**
 * State-erased storage form. `any` on the state params kills the reverse
 * variance of `behavior` (contravariant in `TState`), so a precisely-typed
 * definition flows into the registry without a cast. This is the type the
 * plugin/registry boundary stores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObjectTypeDefinition = ObjectTypeDefinition<any, any>;

/**
 * Builds a single built-in `ObjectTypeDefinition`, preserving per-type `TState`
 * inference at the definition site (mapper / behavior are checked together) before widening to the base-typed record entry. Plugins declare
 * standalone definitions with an explicit annotation instead (see above).
 */
export const defineObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	def: ObjectTypeDefinition<TDoc, TState>,
): ObjectTypeDefinition => def as unknown as ObjectTypeDefinition;
