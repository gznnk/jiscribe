import { pickSupportedDocDefaults } from "./pickSupportedDocDefaults";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFactory } from "../types/ObjectFactory";

/**
 * Minimal shape that DOC_DEFAULTS of point-geometry shapes must satisfy. No
 * width/height, unlike the Frame family: a point shape's doc stores its position
 * only, and the box is materialized in the states layer from the content.
 */
type PointDefaults = Omit<ObjectDoc, "id"> & Record<string, unknown>;

/**
 * Drops the box fields a point-geometry doc has no place for. Callers that size
 * every shape uniformly (docOps.addObject) pass width/height along with the text,
 * and the generated schema is `additionalProperties: false`, so letting them
 * through would write a doc that fails its own validation.
 */
const omitDimensionOverrides = (
	overrides?: Record<string, unknown>,
): Record<string, unknown> => {
	if (overrides === undefined) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(overrides).filter(
			([field]) => field !== "width" && field !== "height",
		),
	);
};

/**
 * Builds an `ObjectFactory` for point-geometry shapes — those whose doc stores a
 * position and nothing else, the box being derived from the content by the
 * states layer (the type's `contentResizer`) once the object enters a canvas.
 *
 * No `createDocFromBounds` is produced: a shape that does not own its box cannot
 * be drag-drawn, so it is click-placed like the other bounds-less shapes.
 *
 * @param defaults - The type's DOC_DEFAULTS; every field of the created doc but `id` and the position comes from here, `docDefaults`, and `overrides` in that order
 * @returns A factory whose `createDoc` stores `position` verbatim as the box's drawn top-left — not its center, the way the frame family reads it, since no box is known at this layer — and whose `calcDimensions` reports zero. Both drop `width` / `height` from `overrides`, this geometry having nowhere to keep them
 */
export const createPointObjectFactory = <TDefaults extends PointDefaults>(
	defaults: TDefaults,
): ObjectFactory => {
	const mergeDefaults = (
		overrides?: Record<string, unknown>,
		docDefaults?: Parameters<typeof pickSupportedDocDefaults>[1],
	): TDefaults =>
		({
			...defaults,
			...pickSupportedDocDefaults(defaults, docDefaults),
			...omitDimensionOverrides(overrides),
		}) as TDefaults;

	return {
		createDoc(position, overrides, docDefaults) {
			return {
				...mergeDefaults(overrides, docDefaults),
				id: crypto.randomUUID(),
				x: position.x,
				y: position.y,
			};
		},

		/**
		 * Zero half-extents: the doc holds no box, so this layer has nothing to
		 * report. Callers use it for the drag ghost's snap bounds and for the size
		 * a programmatic placement offsets by, and both degrade to the position
		 * itself — the box only exists once the states layer materializes it.
		 */
		calcDimensions() {
			return { halfWidth: 0, halfHeight: 0 };
		},
	};
};
