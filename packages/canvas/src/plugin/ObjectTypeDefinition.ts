import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { ObjectDocDefinition } from "@jiscribe/doc/plugin/ObjectDocDefinition";
import type { FC } from "react";

import type { ObjectBehaviorEntry } from "../controllers/gestures/registry/ObjectBehaviorTypes";
import type { DeclaredStyleTable } from "../controllers/style/StyleEntry";
import type { ObjectTransformHandlesDeclaration } from "../controllers/ui/controls/ObjectTransformHandlesRegistry";
import type { SelectionControlDefinition } from "../controllers/ui/controls/SelectionControlTypes";
import type { ObjectTextEditLineBreaksResolver } from "../controllers/ui/editors/ObjectTextEditLineBreaksTypes";
import type { ObjectTextEditOverflowResolver } from "../controllers/ui/editors/ObjectTextEditOverflowTypes";
import type { ObjectMenuSection } from "../controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
import type { PropertyPanelSection } from "../controllers/ui/menu/PropertyPanel/PropertyPanelTypes";
import type { Stencil } from "../controllers/ui/objects/Stencil";
import type { ObjectConnectionAnchorsDeclaration } from "../rendering/objects/registry/ObjectConnectionAnchorsRegistry";
import type { ObjectExtraConnectPointsCalculator } from "../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyCalculator } from "../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectLabelBackdropCalculator } from "../rendering/objects/registry/ObjectLabelBackdropRegistry";
import type { ObjectPartKindDefinition } from "../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectTextMeasurer } from "../rendering/objects/registry/ObjectTextMeasurerRegistry";
import type { ObjectVisualBoundsCalculator } from "../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectMapperType } from "../states/objects/base/MapperTypes";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ObjectContentResizer } from "../states/registry/ObjectContentResizerRegistry";
import type { ObjectStateValidator } from "../states/registry/ObjectStateValidatorRegistry";

/**
 * The full description of a single object type: the headless
 * {@link ObjectDocDefinition} intersected with the UI-layer contracts below, required
 * fields first within each group. A UI definition is structurally a doc definition,
 * so `CanvasPlugin.objects` flows into `createCanvasParser` unchanged.
 *
 * The inherited `textRegion` serves the headless checks and auto height; where the
 * canvas draws the text is the `"textSlot"` part kind's (see `partKinds`). The
 * canvas also calls the inherited `outline` / `anchorRegion`, passing the state:
 * they read only fields a doc and a state share.
 *
 * `TDoc` / `TState` tie the fields declared with them (`mapper`, `behavior`,
 * `component`, …) to one type. A plugin annotates its standalone definition —
 * `ObjectTypeDefinition<ContainerDoc, ContainerState>`; the built-ins go through
 * {@link defineObject}.
 */
export type ObjectTypeDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = ObjectDocDefinition & {
	// --- State ---

	/** Doc ↔ State conversion. */
	mapper: ObjectMapperType<TDoc, TState>;

	/** Type-guard that rejects untrusted State entering the canvas from outside (e.g. pasted clipboard data). */
	stateValidator: ObjectStateValidator;

	/**
	 * Re-derives the box from the content, for a type whose doc stores no size
	 * (`geometry: "point"`). Runs wherever content and box can drift apart: load,
	 * undo/redo, external sync, every committed and uncommitted edit. While a
	 * transform handle is resizing the object, `context.resizedAxes` names the
	 * axes the drag writes and the edge each holds. Omitted = the box stands as the
	 * doc states it, except on a type whose documents may leave `height` out, which
	 * gets the shared auto-height derivation (see ObjectContentResizerRegistry).
	 */
	contentResizer?: ObjectContentResizer<TState>;

	// --- Drawing ---

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
	 * Everything the type draws, including what falls outside its geometry box.
	 * Read by the visual-extent consumers only (zoom-to-fit, export viewBox,
	 * culling, menu placement) — selection and snapping keep using the geometry
	 * box. A `features.text: "label"` type placing its caption itself declares this
	 * together with a `"textSlot"` part kind, and declaring only one is refused at
	 * registration; a `features.text: "innerLabel"` type always declares both.
	 * Omitted = the geometry box, widened by the caption hung under it on a
	 * `"label"` type (see ObjectVisualBoundsRegistry).
	 */
	visualBounds?: ObjectVisualBoundsCalculator;

	/**
	 * What the shape paints under the objects drawn on it, for a frame whose
	 * fill an `"auto"` label lying on it should blend into: such a label is
	 * painted on the page's color and then on these regions, bottom first, where
	 * they lie under its box. Called with the body fill core resolved (state,
	 * type default, last resort, `"auto"` as the theme surface). Not called
	 * while a drag is under way, save for an export taken mid-drag, which is
	 * worked out for what it draws. Omitted = the type is no backdrop, however it
	 * is filled (see ObjectLabelBackdropRegistry).
	 */
	labelBackdrop?: ObjectLabelBackdropCalculator<TState>;

	// --- Connections ---

	/**
	 * Named connection points this type offers on top of the four edge midpoints
	 * every connectable shape has — the brace's `tip`, say. Each carries its own
	 * local position and outward direction, so a connector attaches there and
	 * leaves along it. Their ids are what a saved doc stores in
	 * `{ kind: "connectPoint", id }`, so they must stay stable (paired with the doc
	 * side's `extraConnectPointIds`, see there). Omitted = edge midpoints only (see
	 * ObjectExtraConnectPointsRegistry).
	 */
	extraConnectPoints?: ObjectExtraConnectPointsCalculator;

	/**
	 * How each fixed connection anchor is shown (ConnectionAnchorSpec): how far its
	 * source dot sits from the edge, for a type whose own controls occupy the band
	 * the dot would land in, and whether it is offered at all. Keyed by the edge
	 * anchor ids and the ids `extraConnectPoints` declares. Neither changes where a
	 * connector a doc already attaches lands. One object for the whole type, or a
	 * function asked per object and zoom. Omitted = every anchor offered at the
	 * theme's distance (see ObjectConnectionAnchorsRegistry).
	 */
	connectionAnchors?: ObjectConnectionAnchorsDeclaration<TState>;

	/**
	 * Key over whatever `outline` / `anchorRegion` / `extraConnectPoints` read
	 * beyond the frame fields (cx / cy / width / height / rotation / scaleX /
	 * scaleY), for the consumers that memoize connector endpoint resolution on
	 * those fields. Required for a type whose silhouette can change while the
	 * frame stands still (the callout's tail); without it, connectors attached to
	 * the shape keep the endpoints resolved against the previous silhouette.
	 * Omitted = the frame fields fully determine the resolved geometry (see
	 * ObjectGeometryKeyRegistry).
	 */
	geometryKey?: ObjectGeometryKeyCalculator;

	// --- Text ---

	/**
	 * How `measure.textSlot` measures a slot of a type that draws its body
	 * itself rather than through the shared text layout (`features.text:
	 * "source"`). Omitted = the slot is measured as plain text with
	 * `layoutVisualLines` (see ObjectTextMeasurerRegistry).
	 */
	textMeasurer?: ObjectTextMeasurer<TState>;

	/**
	 * Whether the in-place editor scrolls inside a slot's region or grows past it,
	 * to the shape's bottom edge at most. Only a slot whose region is derived
	 * from the text itself may grow. Omitted = `"scroll"` for every slot (see
	 * ObjectTextEditOverflowRegistry).
	 */
	textEditOverflow?: ObjectTextEditOverflowResolver;

	/**
	 * Whether the in-place editor may hold a line break in a slot. Only a slot
	 * drawn one line tall from a fixed row height should reject them (what the
	 * editor does instead is on TextEditLineBreaks). Omitted = `"allow"` for every
	 * slot (see ObjectTextEditLineBreaksRegistry).
	 */
	textEditLineBreaks?: ObjectTextEditLineBreaksResolver;

	// --- Interaction ---

	/** Move and group-transform functions (`moveByDelta` / `rotateByGroup` / `transformByGroup`). */
	behavior: ObjectBehaviorEntry<TState>;

	/** Type-specific selection controls (handle renderer + gesture strategy pairs). */
	selectionControls?: SelectionControlDefinition<TState>[];

	/**
	 * The sub-parts of an object of this type that core may select and act on —
	 * one entry per part-id namespace (see ObjectPartKindRegistry). Omitted = the
	 * object is indivisible, and every part-aware seam is inert for it.
	 *
	 * A type with `features.text` gets the `"textSlot"` kind without declaring it:
	 * its slots take the whole box, or on a `"label"` type its caption hangs under
	 * the box. Declaring it here (createTextSlotPartKindDefinition, or
	 * `createFrameObjectDefinition({ textRegion })`) replaces that one, and its
	 * `region` / `regions` are where the slots are drawn, edited and outlined. A
	 * `"label"` / `"innerLabel"` type's kind must state one of the two, and an
	 * `"innerLabel"` type must declare the kind (and see `visualBounds`).
	 */
	partKinds?: ObjectPartKindDefinition<TState>[];

	/**
	 * Which handles the transform frame offers on a single selection. Omitted =
	 * every handle (eight resize handles + rotation knob). A function is asked per
	 * object, for a type whose objects do not all take the same handles, and must
	 * return one of a fixed set of values (see ObjectTransformHandlesRegistry).
	 * Affects the handles only — the selection outline, snapping and the bounding
	 * box are unchanged.
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

	// --- Editor UI ---

	/**
	 * Stencils this type contributes to the palette (multiple allowed per type).
	 * Registration only makes them exist; where they show and in what order is
	 * decided by `toolbar.sections` (a pinned item, or a category's `presetIds`)
	 * and `stencilLibrary.sections` (a sidebar section's `presetIds`). Needs a
	 * `factory`: declaring stencils without one is refused at registration.
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
 * Builds a single built-in `ObjectTypeDefinition`, checking `mapper` / `behavior`
 * against one inferred `TState` before widening to the base-typed record entry;
 * annotating the record literal with the base type would erase that inference.
 * Plugins annotate a standalone definition instead.
 *
 * @param def - The definition; handed back as it is at runtime, the widening being type-level only
 * @returns The same object, typed with the base `ObjectDoc` / `ObjectState`
 */
export const defineObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	def: ObjectTypeDefinition<TDoc, TState>,
): ObjectTypeDefinition => def as unknown as ObjectTypeDefinition;
