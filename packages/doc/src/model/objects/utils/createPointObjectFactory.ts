import type { Dimensions } from "@jiscribe/geometry";

import { calcPointDocDrawnTopLeft } from "./pointDocDrawnTopLeft";
import { roundDocCoordinate } from "./roundDocNumbers";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFactory } from "../types/ObjectFactory";

/**
 * Minimal shape that DOC_DEFAULTS of point-geometry shapes must satisfy. No
 * width/height, unlike the Frame family: a point shape's doc stores its position
 * only, and the box is materialized in the states layer from the content.
 */
type PointDefaults = Omit<ObjectDoc, "id"> & Record<string, unknown>;

/** The box a point-geometry doc of these fields draws, measured from its content. */
export type PointObjectSizeCalculator = (
	doc: Readonly<Record<string, unknown>>,
) => Dimensions;

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
 * position and nothing else, the box being derived from the content (the type's
 * `contentResizer` re-derives it in the states layer as the content changes).
 *
 * No `createDocFromBounds` is produced: a shape that does not own its box cannot
 * be drag-drawn, so it is click-placed like the other bounds-less shapes.
 *
 * @param defaults - The type's DOC_DEFAULTS; every field of the created doc but `id` and the position comes from here and `overrides`, in that order
 * @param measureSize - Measures the box the doc about to be written draws, from the merged defaults and overrides; it is what makes the placement center-based, as every other geometry's is
 * @returns A factory reading `position` as the box's center like the frame family, and storing the drawn top-left corner that center puts the measured box at (see GeometryType). Both methods drop `width` / `height` from `overrides`, this geometry having nowhere to keep them
 */
export const createPointObjectFactory = <TDefaults extends PointDefaults>(
	defaults: TDefaults,
	measureSize: PointObjectSizeCalculator,
): ObjectFactory => {
	const mergeDefaults = (overrides?: Record<string, unknown>): TDefaults =>
		({
			...defaults,
			...omitDimensionOverrides(overrides),
		}) as TDefaults;

	return {
		createDoc(position, overrides) {
			const merged = mergeDefaults(overrides);
			const drawnTopLeft = calcPointDocDrawnTopLeft(
				position,
				measureSize(merged),
				merged,
			);
			// Cloned because defaults and overrides are module-level constants: a nested
			// value shared between two created objects (a record's text slots) would let
			// an in-place edit of one rewrite the other (same rule as
			// createFrameObjectFactory).
			return structuredClone({
				...merged,
				id: crypto.randomUUID(),
				// Rounded because the corner comes out of an affine transform, whose float
				// tail would otherwise be persisted and make the placement's round trip
				// inexact.
				x: roundDocCoordinate(drawnTopLeft.x),
				y: roundDocCoordinate(drawnTopLeft.y),
			});
		},

		calcDimensions(overrides) {
			const size = measureSize(mergeDefaults(overrides));
			return { halfWidth: size.width / 2, halfHeight: size.height / 2 };
		},
	};
};
