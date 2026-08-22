import type { ObjectDocTextRegionCalculator } from "./ObjectDocTextRegion";
import type { ObjectDocValidateFn } from "./ObjectDocValidatorRegistry";
import type { ObjectTextSlotStyleDefaults } from "./ObjectTextStyleDefaultsRegistry";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { ObjectFactory } from "../model/objects/types/ObjectFactory";
import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";

/**
 * Headless (UI-independent) description of a single object type: everything the
 * parse layer needs to know a type exists, validate its doc, and create it from
 * a doc — with no React / rendering / control dependency — plus the
 * AI-facing metadata the schema/docs generator reads (`pnpm generate:ai`,
 * packages/ai-docs). The full `ObjectTypeDefinition`
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
	 * Where the type lays its text out, given a doc of it: the rectangle the
	 * rendering layer's `textRegion` resolves, answerable with no rendering layer
	 * present. The single declaration of the shape's text region — the UI
	 * definition registers the same calculator, so a headless overflow check
	 * (`@jiscribe/doc-tools`) and the canvas can never disagree about it.
	 *
	 * `null` from the calculator means the box does not hold the text (a label
	 * drawn outside the outline, bands sized from their own text); omitting the
	 * field means the type has not declared one at all, which a checker reports
	 * rather than guessing at. Declaring a rectangle is also what lets a document
	 * leave the type's `height` out and have it follow the text
	 * ({@link import("./supportsAutoHeight").supportsAutoHeight}), so a
	 * `geometry: "rect"` type's declaration decides the shape of its schema too.
	 * Every type with `features.text: "body"` should
	 * declare one — {@link import("./ObjectDocTextRegion").calcFullBoxTextRegion}
	 * for a plain box,
	 * {@link import("./ObjectDocTextRegion").calcOutsideBoxTextRegion} for a label
	 * drawn outside the outline.
	 */
	textRegion?: ObjectDocTextRegionCalculator;

	/**
	 * Set to `false` by a type whose box must not be sized from the text laid out
	 * in its region, even though {@link textRegion} says it could — the one
	 * declaration {@link import("./supportsAutoHeight").supportsAutoHeight} cannot
	 * derive from the region, since neither reason is visible in a rectangle:
	 *
	 * - the height is settled by something other than the text (`container` is as
	 *   tall as the children it frames; its region is only the title band)
	 * - the body is not drawn by the shared text layout, so measuring it as
	 *   wrapped plain text gives a height the shape is not drawn at (`markdown`
	 *   renders its source)
	 *
	 * There is no `true`: a type may only ever deny what its region implies, never
	 * claim what it does not — leaving this out is the normal case and lets the
	 * region decide.
	 */
	autoHeight?: false;

	/**
	 * AI-facing description of the shape (1–3 sentences, English): what it draws,
	 * what it is typically used for, and where text is laid out. Verbatim source of
	 * the type's JSON-schema `$def` description and its reference.md section, so
	 * write it for an AI that has not seen the rendering.
	 */
	description?: string;

	/**
	 * One-line usage summary for doc tables (e.g. "decision / branch node in
	 * flowcharts"). Shorter than {@link description}: a noun phrase, no period.
	 */
	summary?: string;

	/**
	 * Short phrase describing the drawn outline (e.g. "Rectangle with both top
	 * corners cut off") for shape-catalog tables. Only needed for types listed in
	 * a grouped catalog section of the generated docs. (Named to avoid clashing
	 * with ObjectTypeDefinition's `outline` hit-test calculator.)
	 */
	outlineDescription?: string;

	/**
	 * Creation defaults of the shape (its `*_DOC_DEFAULTS`, minus `id`). The doc
	 * generator reads per-field defaults from here; fields that differ from the
	 * shared style defaults are called out in the generated schema.
	 */
	defaults?: Omit<ObjectDoc, "id"> & Readonly<Record<string, unknown>>;

	/**
	 * Draw-time text-style defaults of a `features.text: "slots"` type, keyed by
	 * slot id: what each slot's typography falls back to where the document sets
	 * none (ObjectTextStyleDefaultsRegistry). Declared here because a keyed type's
	 * styling has no flat doc field for {@link defaults} to carry it in; a
	 * `"body"` type needs none, its single slot's defaults being read off
	 * {@link defaults} instead.
	 *
	 * Resolved per read and never written back, so a field the author omitted
	 * stays omitted in the saved document.
	 */
	textSlotStyleDefaults?: ObjectTextSlotStyleDefaults;
};
