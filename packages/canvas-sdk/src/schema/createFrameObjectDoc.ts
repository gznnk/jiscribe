import type {
	ObjectDoc,
	ObjectDocDefinition,
	ObjectDocValidateFn,
	ObjectFeatures,
} from "@jiscribe/canvas/doc";
import {
	createFrameDocValidator,
	createFrameObjectFactory,
} from "@jiscribe/canvas/unstable-doc";

/** The `factory` of an {@link ObjectDocDefinition}, which `@jiscribe/canvas/doc` does not name on its own. */
type ObjectFactory = NonNullable<ObjectDocDefinition["factory"]>;

/** The part of {@link FrameObjectDocParams} that does not take part in the factory choice. */
type FrameObjectDocCommonParams = {
	/**
	 * Geometry kind and capability flags of the shape. `geometry` must be `"rect"`:
	 * the generated factory places the shape from x/y/width/height.
	 */
	features: ObjectFeatures;

	/**
	 * Creation defaults of the shape (its `*_DOC_DEFAULTS`, minus `id`). Feeds the
	 * derived factory and is carried into the definition as-is, so the generated
	 * schema and the object the canvas creates read the same values. Required even
	 * when `factory` is given, since the definition carries it either way.
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
};

/**
 * Arguments of {@link createFrameObjectDoc}. `factory` and `supportsBounds` are
 * mutually exclusive: `supportsBounds` only tunes the derived factory, so a shape
 * that supplies its own cannot set it.
 */
export type FrameObjectDocParams = FrameObjectDocCommonParams &
	(
		| {
				factory?: undefined;

				/**
				 * Whether drag-drawing from a two-point bounds is supported (default true).
				 * `false` leaves the derived factory without `createDocFromBounds`, so the
				 * shape is center-placed on click.
				 */
				supportsBounds?: boolean;
		  }
		| {
				/**
				 * Factory to register as-is, skipping the one that would be derived from
				 * `defaults`. For a shape whose creation is not the plain Frame-family
				 * one (a family-specific wrapper, say); drag-drawing then depends solely
				 * on whether this factory carries `createDocFromBounds`.
				 */
				factory: ObjectFactory;

				supportsBounds?: never;
		  }
	);

/**
 * Builds the whole {@link ObjectDocDefinition} of a Frame-family shape
 * (`geometry: "rect"`, top-left origin) from its features and defaults: the doc
 * validator and the factory are derived, and the AI-facing metadata is passed
 * through. Replaces the per-shape `*ObjectFactory.ts` / `validate*Doc.ts` pair.
 * A shape whose creation is not the plain Frame-family one passes its own
 * `factory` instead of having one derived.
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
	factory,
	supportsBounds,
}: FrameObjectDocParams): ObjectDocDefinition => ({
	features,
	validateDoc: createFrameDocValidator(features, validateExtra),
	factory: factory ?? createFrameObjectFactory(defaults, { supportsBounds }),
	description,
	summary,
	outlineDescription,
	defaults,
});
