import type { ObjectDocAnchorRegionCalculator } from "./ObjectDocAnchorRegion";
import type { ObjectDocBoundsCalculator } from "./ObjectDocBounds";
import type { ObjectDocOutlineCalculator } from "./ObjectDocOutline";
import type { ObjectDocOverflowDiagnoser } from "./ObjectDocOverflow";
import type { ObjectDocTextRegionCalculator } from "./ObjectDocTextRegion";
import type { ObjectDocValidateFn } from "./ObjectDocValidateFn";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { ObjectFactory } from "../model/objects/types/ObjectFactory";
import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectTextSlotStyleDefaults } from "../registries/ObjectTextStyleDefaultsRegistry";

/**
 * Headless (UI-independent) description of a single object type, usable without
 * React or a rendering layer. Read by the parser, the doc ops, doc-tools, ai-tools
 * and the schema generator (packages/doc-schema) as well as the canvas. The full `ObjectTypeDefinition` (`@jiscribe/canvas`)
 * is this intersected with the UI-side contracts, so a UI definition is
 * structurally a doc definition.
 */
export type ObjectDocDefinition = {
	/** Geometry kind and per-type capability flags (see ObjectFeatures). */
	features: ObjectFeatures;

	/** Doc validator used by parse-time structure/semantic validation. */
	validateDoc: ObjectDocValidateFn;

	/**
	 * Names of the doc fields this type carries beyond the ones `features` implies —
	 * the callout's `tail`, the container's `headerFill` / `headerHeight`. The single
	 * declaration of what the type is allowed to hold: the mapper passes exactly these
	 * between doc and state, and doc-ops refuses any other name written through
	 * `extraProps` (on creation or through `setExtraProps`).
	 *
	 * Tie the array to the doc type with `satisfies readonly (keyof XxxDoc)[]`, so a
	 * field added to one and not the other fails to compile. Omitted means the type has
	 * no fields of its own.
	 */
	extraKeys?: readonly string[];

	/**
	 * How a new doc of this type is made: placed at a point, sized for the ghost, or
	 * drawn between two points (see ObjectFactory). Omitted = the type cannot be
	 * created from scratch — the doc ops refuse to add one and the canvas offers no
	 * tool for it; documents may still hold it.
	 */
	factory?: ObjectFactory;

	/**
	 * Creation defaults of the shape (its `*_DOC_DEFAULTS`, minus `id`). Also where the
	 * shape-style and body-slot text-style fallbacks are read from when a document sets
	 * none (ObjectShapeStyleDefaultsRegistry / ObjectTextStyleDefaultsRegistry), and
	 * the per-field defaults of the generated schema, which calls out fields differing
	 * from the shared style defaults.
	 */
	defaults?: Omit<ObjectDoc, "id"> & Readonly<Record<string, unknown>>;

	/**
	 * The box a `geometry: "point"` type's doc implies, its doc storing the corner it
	 * is drawn from and no size (see {@link ObjectDocBoundsCalculator}). Every point
	 * type must declare one; other types normally leave it out, and a declaration
	 * outranks the geometry's own rule whatever the geometry. Hand the same measurement to the factory
	 * (`createPointObjectFactory`) so placing and measuring cannot disagree. A point
	 * type missing it is caught by its plugin's parse-check suite and by `diagnoseDoc`
	 * ({@link import("./isMissingBounds").isMissingBounds}).
	 */
	bounds?: ObjectDocBoundsCalculator;

	/**
	 * The drawn silhouette, for a type whose outline is not the box its geometry
	 * implies (see {@link ObjectDocOutlineCalculator}): where a connector end and a
	 * connection anchor land on the canvas, and the stretch of each side an
	 * automatic layout keeps its edge anchors on. Omitted = the bounding-box
	 * rectangle, or the ellipse for a `geometry: "ellipse"` type.
	 */
	outline?: ObjectDocOutlineCalculator;

	/**
	 * The band the edge anchors are centered on and measured along (see
	 * {@link ObjectDocAnchorRegionCalculator}). Omitted = the full bounding box.
	 */
	anchorRegion?: ObjectDocAnchorRegionCalculator;

	/**
	 * The connect point ids a doc of this type offers beyond the built-in four
	 * (`topCenter` …): what a connector end may name as `{ kind: "connectPoint", id }`
	 * besides those. Answered per doc, since the set may follow its content (an ER
	 * entity's `col:<i>:left|right`, one pair per column). Must list exactly the ids
	 * the presentation's `extraConnectPoints` places, in the same order. Omitted = the
	 * type offers none, so the doc ops refuse any other id on it.
	 */
	extraConnectPointIds?: (doc: ObjectDoc) => readonly string[];

	/**
	 * Declared by a titled region other objects sit inside (a VPC, a subsystem
	 * boundary). An automatic layout keeps the objects a doc of this type holds inside
	 * it and sizes it to them, instead of moving it as one box among the others, and
	 * keeps `titleHeight` px below the top edge clear for the title band. Answered per
	 * doc, since a type may let a document size its band (the container's
	 * `headerHeight`); the answer may exceed the box's height. Only a type whose
	 * `geometry` is `"rect"` is resized that way; any other is moved whole. Omitted = a
	 * doc of this type is a box like any other.
	 */
	layoutContainer?: (doc: ObjectDoc) => { titleHeight: number };

	/**
	 * Where the type lays one text slot out, given a doc of it. Read by the headless
	 * checks (`diagnoseDoc` / `resolveContentBox`) and auto height; the canvas draws the text in the
	 * `"textSlot"` part kind's `region`, and the shipped shapes pass the same
	 * calculator to both.
	 *
	 * Required of every `"body"` / `"source"` type, the parser refusing the
	 * definition otherwise ({@link import("./ObjectDocTextRegion").calcFullBoxTextRegion}
	 * for a plain box); optional for a `"slots"` type, which may place its slots on
	 * its `"textSlot"` part kind instead; refused on a `"label"` type, whose caption
	 * is placed on the canvas side.
	 */
	textRegion?: ObjectDocTextRegionCalculator;

	/**
	 * Draw-time text-style defaults of a `features.text: "slots"` type: what each
	 * slot's typography falls back to where the document sets none
	 * (ObjectTextStyleDefaultsRegistry). Declared as `byTextSlot` for the slots the
	 * type names (a map, or a function of the slot id), or as `everyTextSlot` by a
	 * type whose slot set is not fixed (see {@link ObjectTextSlotStyleDefaults}).
	 * A `"body"` / `"source"` / `"label"` type needs none, its one slot's defaults
	 * being read off {@link defaults}. Resolved per read and never written back, so a
	 * field the author omitted stays omitted in the saved document.
	 */
	textSlotStyleDefaults?: ObjectTextSlotStyleDefaults;

	/**
	 * Set to `false` by a `geometry: "rect"`, `"body"` type whose height is settled by
	 * something other than its text (`container` is as tall as the children it
	 * frames) — the one denial
	 * {@link import("./supportsAutoHeight").supportsAutoHeight} cannot derive from the
	 * features. A type may only deny what its features imply, so there is no `true`;
	 * a `"source"` type needs none, the features already ruling it out.
	 */
	autoHeight?: false;

	/**
	 * Room a derived height leaves above the text and again below it, in multiples
	 * of the body slot's font size, outside the text box's own `TEXT_BOX_PADDING_Y`.
	 * A finite number at or above 0; omitted, or any other value, means
	 * `AUTO_HEIGHT_COMFORT_PADDING_EM`. Matters only for a type supporting auto
	 * height ({@link import("./supportsAutoHeight").supportsAutoHeight}), and there
	 * only to an object leaving `height` out; a document never carries it. Ignored on the canvas by a type declaring its own
	 * `contentResizer`.
	 */
	autoHeightPaddingEm?: number;

	/**
	 * Reports content the type places itself that its box is too small for (see
	 * {@link ObjectDocOverflowDiagnoser}): what the shared typesetting cannot
	 * measure, because the type stacks or sizes it by a rule of its own — a
	 * record's compartments, an ER entity's one-line columns. `diagnoseDoc`
	 * calls it for any type that declares one and reports each message as an
	 * error on the object. Omitted means the type has nothing beyond
	 * {@link textRegion} to check.
	 */
	diagnoseOverflow?: ObjectDocOverflowDiagnoser;

	/**
	 * AI-facing description of the shape (1–3 sentences, English): what it draws,
	 * what it is typically used for, and where text is laid out. Verbatim source of
	 * the type's JSON-schema `$def` description — the only field-level reference an
	 * AI gets — so write it for one that has not seen the rendering.
	 */
	description?: string;

	/**
	 * One-line usage summary for doc tables (e.g. "decision / branch node in
	 * flowcharts"). Shorter than {@link description}: a noun phrase, no period.
	 */
	summary?: string;
};
