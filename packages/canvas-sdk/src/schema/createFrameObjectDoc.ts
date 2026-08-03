import type {
	ObjectDoc,
	ObjectDocDefinition,
	ObjectDocValidateFn,
	ObjectFeatures,
} from "@workspace/canvas/doc";
import {
	createFrameDocValidator,
	createFrameObjectFactory,
} from "@workspace/canvas/unstable-doc";

/** Arguments of {@link createFrameObjectDoc}. */
export type FrameObjectDocParams = {
	/**
	 * Geometry kind and capability flags of the shape. `geometry` must be `"rect"`:
	 * the generated factory places the shape from x/y/width/height.
	 */
	features: ObjectFeatures;

	/**
	 * Creation defaults of the shape (its `*_DOC_DEFAULTS`, minus `id`). Feeds the
	 * factory and is carried into the definition as-is, so the generated schema and
	 * the object the canvas creates read the same values.
	 */
	defaults: Omit<ObjectDoc, "id"> & {
		width: number;
		height: number;
	} & Record<string, unknown>;

	/** AI-facing description of the shape (see `ObjectDocDefinition.description`). */
	description?: string;

	/** One-line usage summary for doc tables (see `ObjectDocDefinition.summary`). */
	summary?: string;

	/** Short phrase describing the drawn outline (see `ObjectDocDefinition.outlineDescription`). */
	outlineDescription?: string;

	/**
	 * Doc checks beyond the ones features implies (the closed slot set of a
	 * `text: "slots"` type, say), run after them. Returns the diagnostics it found;
	 * an empty array means valid.
	 */
	validateExtra?: ObjectDocValidateFn;

	/**
	 * Whether drag-drawing from a two-point bounds is supported (default true).
	 * `false` leaves the factory without `createDocFromBounds`, so the shape is
	 * center-placed on click.
	 */
	supportsBounds?: boolean;
};

/**
 * Builds the whole {@link ObjectDocDefinition} of a Frame-family shape
 * (`geometry: "rect"`, top-left origin) from its features and defaults: the doc
 * validator and the factory are derived, and the AI-facing metadata is passed
 * through. Replaces the per-shape `*ObjectFactory.ts` / `validate*Doc.ts` pair.
 *
 * Declaring an `ObjectDocDefinition` by hand stays supported — this is sugar, and
 * `createFrameDocValidator` / `createFrameObjectFactory` remain exported for a
 * shape that needs only one of them.
 *
 * @param params - Features and defaults are required; the rest is optional
 *   metadata and hooks (see {@link FrameObjectDocParams})
 */
export const createFrameObjectDoc = ({
	features,
	defaults,
	description,
	summary,
	outlineDescription,
	validateExtra,
	supportsBounds,
}: FrameObjectDocParams): ObjectDocDefinition => ({
	features,
	validateDoc: createFrameDocValidator(features, validateExtra),
	factory: createFrameObjectFactory(defaults, { supportsBounds }),
	description,
	summary,
	outlineDescription,
	defaults,
});
