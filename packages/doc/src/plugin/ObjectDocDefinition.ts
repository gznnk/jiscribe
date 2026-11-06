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
 * Headless (UI-independent) description of a single object type: everything the
 * parse layer needs to know a type exists, validate its doc, and create it from
 * a doc — with no React / rendering / control dependency — plus the
 * AI-facing metadata the schema/docs generator reads (`pnpm generate:schema`,
 * packages/doc-schema). The full `ObjectTypeDefinition`
 * (`@jiscribe/canvas`, plugin/ObjectTypeDefinition) is this intersected with the
 * UI-side contracts, so a UI definition is structurally a doc definition.
 */
export type ObjectDocDefinition = {
	/** Geometry kind and per-type capability flags (see ObjectFeatures). */
	features: ObjectFeatures;

	/** Doc validator used by parse-time structure/semantic validation. */
	validateDoc: ObjectDocValidateFn;

	/** Doc creation, dimensions, and bounds generation. Omitted for types not created programmatically. */
	factory?: ObjectFactory;

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
	 * The box this type's doc implies, where the geometry does not settle it on its
	 * own — a `geometry: "point"` type, whose doc stores the corner it is drawn from
	 * and no size (see {@link ObjectDocBoundsCalculator}). A declaration outranks the
	 * geometry's own rule whatever that geometry is; every type but a point one
	 * leaves it out and is measured from the fields it stores.
	 *
	 * A point type measuring its own box is why nothing shared has to: the
	 * conversion from the stored corner to the box is one call
	 * (`calcPointDocCenter`), and what differs — the measurement — is the type's
	 * alone. Hand that same measurement to the type's factory
	 * (`createPointObjectFactory`), so where a new shape is placed and where a saved
	 * one is measured, aligned and distributed cannot disagree.
	 *
	 * Every `geometry: "point"` type has to declare one; omitting it leaves the type
	 * with no box at all, which is checked rather than guessed at
	 * ({@link import("./isMissingBounds").isMissingBounds}) — a plugin's own
	 * parse-check suite fails on it, and `diagnoseDoc` reports it against a document
	 * already holding one.
	 */
	bounds?: ObjectDocBoundsCalculator;

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
	 * Declared by a titled region other objects sit inside (a VPC, a subsystem
	 * boundary). An automatic layout keeps the objects a doc of this type holds inside
	 * it and sizes it to them, instead of moving it as one box among the others, and
	 * keeps `titleHeight` px below the top edge clear for the title band. Answered per
	 * doc, since a type may let a document size its band (the container's
	 * `headerHeight`); the answer may exceed the box's height. Only a type whose
	 * `geometry` is `"rect"` is resized that way; any other is moved whole. Omitted = a
	 * doc of this type is a box like any other.
	 */
	container?: (doc: ObjectDoc) => { titleHeight: number };

	/**
	 * Where the type lays one text slot out, given a doc of it: the rectangle the
	 * text is placed in, answerable with no rendering layer present. The headless
	 * checks (`diagnoseDoc` / `resolveContentBox` in `@jiscribe/doc-tools`) and the
	 * auto-height measurement (`resizeAutoHeightStateToContent`) read it; where the
	 * canvas draws the text is the `"textSlot"` part kind's `region`, and the
	 * shipped shapes pass the same calculator to both sides so the two cannot
	 * disagree.
	 *
	 * A declaration for any text form — the one `body` of a `"body"` / `"source"`
	 * type, a cell or a band of a `"slots"` type. Every `"body"` / `"source"` type
	 * must declare one ({@link import("./ObjectDocTextRegion").calcFullBoxTextRegion}
	 * for a plain box), and the parser refuses the definition otherwise
	 * (resolveDocDefinitions). A `"slots"` type may leave it out, placing its slots
	 * on its `"textSlot"` part kind. A `features.text: "label"` type must not
	 * declare one: its caption is placed on the canvas side.
	 */
	textRegion?: ObjectDocTextRegionCalculator;

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
	 * Set to `false` by a `geometry: "rect"`, `"body"` type whose box must not be
	 * sized from the text laid out in its region, its height being settled by
	 * something other than the text (`container` is as tall as the children it
	 * frames; its region is only the title band) — the one declaration
	 * {@link import("./supportsAutoHeight").supportsAutoHeight} cannot derive
	 * from the features. A `"source"` type needs none: its body is not drawn by
	 * the shared text layout, which the features already say.
	 *
	 * There is no `true`: a type may only ever deny what its features imply, never
	 * claim what they do not — leaving this out is the normal case.
	 */
	autoHeight?: false;

	/**
	 * Room a derived height leaves above the text and, again, below it, in
	 * multiples of the body slot's font size — vertical only, charged outside the
	 * text box's own `TEXT_BOX_PADDING_Y`. A finite number at or above 0; omitted
	 * means `AUTO_HEIGHT_COMFORT_PADDING_EM`, and so does a value outside
	 * that range. Read only where a height is derived, so it matters to a type whose
	 * documents may leave `height` out
	 * ({@link import("./supportsAutoHeight").supportsAutoHeight}) and, there, to
	 * an object that does; a document never carries it.
	 * The canvas reads it through the shared content resizer alone, so a type
	 * declaring a `contentResizer` of its own has it ignored there.
	 */
	autoHeightPaddingEm?: number;

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

	/**
	 * Creation defaults of the shape (its `*_DOC_DEFAULTS`, minus `id`). The doc
	 * generator reads per-field defaults from here; fields that differ from the
	 * shared style defaults are called out in the generated schema.
	 */
	defaults?: Omit<ObjectDoc, "id"> & Readonly<Record<string, unknown>>;

	/**
	 * Draw-time text-style defaults of a `features.text: "slots"` type: what each
	 * slot's typography falls back to where the document sets none
	 * (ObjectTextStyleDefaultsRegistry). Declared as `byTextSlot` for the slots the
	 * type names (a map, or a function of the slot id), or as `everyTextSlot` by a
	 * type whose slot set is not fixed (see
	 * {@link ObjectTextSlotStyleDefaults}). Declared here because a keyed type's
	 * styling has no flat doc field for {@link defaults} to carry it in; a
	 * `"body"` type needs none, its single slot's defaults being read off
	 * {@link defaults} instead.
	 *
	 * Resolved per read and never written back, so a field the author omitted
	 * stays omitted in the saved document.
	 */
	textSlotStyleDefaults?: ObjectTextSlotStyleDefaults;
};
