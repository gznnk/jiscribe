import type { ObjectDoc } from "../objects/base/ObjectDoc";
import type { ObjectFactory } from "../objects/types/ObjectFactory";
import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectDocValidateFn } from "../registry/ObjectDocValidatorRegistry";
import type { ObjectTextSlotStyleDefaults } from "../registry/ObjectTextStyleDefaultsRegistry";

/**
 * Headless (UI-independent) description of a single object type: everything the
 * parse layer needs to know a type exists, validate its doc, and create it from
 * a doc — with no React / presentation / controller dependency — plus the
 * AI-facing metadata the schema/docs generator reads (`pnpm generate:ai`,
 * packages/ai-docs). The full
 * {@link import("../../plugin/ObjectTypeDefinition").ObjectTypeDefinition} is this
 * intersected with the UI-side contracts, so a UI definition is structurally a
 * doc definition.
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
	 * between doc and state, and doc-ops refuses any other name written through a
	 * creation call's `props`.
	 *
	 * Tie the array to the doc type with `satisfies readonly (keyof XxxDoc)[]`, so a
	 * field added to one and not the other fails to compile. Omitted means the type has
	 * no fields of its own.
	 */
	extraKeys?: readonly string[];

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
