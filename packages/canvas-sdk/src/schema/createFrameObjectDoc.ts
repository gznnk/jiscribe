import type {
	ObjectDoc,
	ObjectDocAnchorRegionCalculator,
	ObjectDocDefinition,
	ObjectDocOutlineCalculator,
	ObjectDocOverflowDiagnoser,
	ObjectDocTextRegionCalculator,
	ObjectDocValidateFn,
	ObjectFeatures,
	ObjectTextSlotStyleDefaults,
} from "@jiscribe/doc";
import {
	createFrameDocValidator,
	createFrameObjectFactory,
} from "@jiscribe/doc/unstable";

/** The `factory` of an {@link ObjectDocDefinition}, which `@jiscribe/doc` does not name on its own. */
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

	/**
	 * Names of the doc fields this shape carries beyond the ones `features` implies
	 * (see `ObjectDocDefinition.extraKeys`). Declare it as
	 * `["tail"] satisfies readonly (keyof CalloutDoc)[]` so the list cannot drift from
	 * the doc type. The definition this builds is the single place it is declared:
	 * the mapper, doc-ops and the parser all read it from there, the last of which
	 * is what keeps a document's own field from being reported as unknown and
	 * dropped on save.
	 */
	extraKeys?: readonly string[];

	/**
	 * Where the shape lays its text out (see `ObjectDocDefinition.textRegion`):
	 * the rectangle the headless checks and the auto-height measurement read,
	 * `calcFullBoxTextRegion` for the whole box. Where the canvas draws the text
	 * is the UI definition's `textRegion` (the `"textSlot"` part kind), and the
	 * shipped shapes pass the same function to both sides. Required of a
	 * `"body"` / `"source"` shape; a `"label"` shape declares none.
	 */
	textRegion?: ObjectDocTextRegionCalculator;

	/**
	 * The drawn silhouette, for a shape whose outline is not its box (see
	 * `ObjectDocDefinition.outline`): what connector ends land on and what an
	 * automatic layout keeps its edge anchors on. Carried into the definition
	 * as-is, which is the one place it is declared — the UI definition built by
	 * `createFrameObjectDefinition` inherits it. Omitted = the bounding box.
	 */
	outline?: ObjectDocOutlineCalculator;

	/**
	 * The band the edge anchors are centered on and measured along (see
	 * `ObjectDocDefinition.anchorRegion`). Carried into the definition as-is.
	 * Omitted = the full bounding box.
	 */
	anchorRegion?: ObjectDocAnchorRegionCalculator;

	/**
	 * Declares the shape a titled region other objects sit inside, answering the
	 * title band's height for a doc (see `ObjectDocDefinition.container`). Carried
	 * into the definition as-is.
	 */
	container?: ObjectDocDefinition["container"];

	/**
	 * Reports content the shape stacks or sizes by a rule of its own that the box
	 * is too small for (see `ObjectDocDefinition.diagnoseOverflow`). Carried into
	 * the definition as-is.
	 */
	diagnoseOverflow?: ObjectDocOverflowDiagnoser;

	/**
	 * Pass `false` for a `"body"` shape whose box must not be sized from its
	 * text, its height being settled by something else (the children it frames;
	 * see `ObjectDocDefinition.autoHeight`). Omit it in every other case. It also
	 * reaches the derived validator, which is what keeps `height` required.
	 */
	autoHeight?: false;

	/**
	 * Room a height derived from the text leaves above and below it (see
	 * `ObjectDocDefinition.autoHeightPaddingEm`). Carried into the definition
	 * as-is.
	 */
	autoHeightPaddingEm?: number;

	/** AI-facing description of the shape (see `ObjectDocDefinition.description`). */
	description?: string;

	/** One-line usage summary for doc tables (see `ObjectDocDefinition.summary`). */
	summary?: string;

	/**
	 * Doc checks beyond the ones features implies (the closed slot set of a
	 * `text: "slots"` type, say), run after them. Returns the diagnostics it found;
	 * an empty array means valid.
	 */
	validateExtra?: ObjectDocValidateFn;

	/**
	 * Draw-time text-style defaults of a `text: "slots"` shape — `byTextSlot` for the
	 * slots it names, `everyTextSlot` for a shape whose slot set is not fixed (see
	 * `ObjectDocDefinition.textSlotStyleDefaults`). A root-form shape (`"body"` /
	 * `"source"` / `"label"`) omits it: its single slot's defaults are read off
	 * {@link defaults}.
	 */
	textSlotStyleDefaults?: ObjectTextSlotStyleDefaults;
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
	extraKeys,
	textRegion,
	outline,
	anchorRegion,
	container,
	diagnoseOverflow,
	autoHeight,
	autoHeightPaddingEm,
	description,
	summary,
	validateExtra,
	factory,
	supportsBounds,
	textSlotStyleDefaults,
}: FrameObjectDocParams): ObjectDocDefinition => ({
	features,
	validateDoc: createFrameDocValidator(features, validateExtra, {
		autoHeight,
	}),
	extraKeys,
	factory: factory ?? createFrameObjectFactory(defaults, { supportsBounds }),
	textRegion,
	outline,
	anchorRegion,
	container,
	diagnoseOverflow,
	autoHeight,
	autoHeightPaddingEm,
	description,
	summary,
	defaults,
	textSlotStyleDefaults,
});
