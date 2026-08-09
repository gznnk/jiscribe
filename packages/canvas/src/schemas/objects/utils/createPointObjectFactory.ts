import type { Dimensions } from "@workspace/geometry";
import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFactory } from "../types/ObjectFactory";
import { pickSupportedDocDefaults } from "../types/ObjectFactory";

/**
 * Minimal shape that DOC_DEFAULTS of point-geometry shapes must satisfy. No
 * width/height, unlike the Frame family: a point shape's doc stores its position
 * only, and the size comes from `calcSize`.
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
 * Builds an `ObjectFactory` for point-geometry shapes (doc: a position only,
 * size derived from the content).
 *
 * No `createDocFromBounds` is produced: a shape that does not own its box cannot
 * be drag-drawn, so it is click-placed like the other bounds-less shapes. The
 * measured box is centered on the given position, which is what makes dropping
 * one look the same as dropping any other stencil.
 *
 * @param defaults - The type's DOC_DEFAULTS; every field of the created doc but `id` and the position comes from here, `docDefaults`, and `overrides` in that order
 * @param calcSize - Measures the box of an assembled doc. Called with defaults + overrides already merged, so it sees the same text and typography the created object will carry
 * @returns A factory whose `createDoc` centers the measured box on `position` and whose `calcDimensions` reports that box's half-extents for the drag ghost. Both ignore `width` / `height` in `overrides`, which this geometry cannot store
 */
export const createPointObjectFactory = <TDefaults extends PointDefaults>(
	defaults: TDefaults,
	calcSize: (doc: TDefaults) => Dimensions,
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
			const doc = mergeDefaults(overrides, docDefaults);
			const { width, height } = calcSize(doc);
			// Rounded for the same reason resizeTextStateToContent rounds: a caller
			// that hands in a center built from a fractional half-extent gets the
			// corner it asked for back, instead of one carrying float residue.
			return {
				...doc,
				id: crypto.randomUUID(),
				x: roundToDecimal(position.x - width / 2, PRECISION.COORDINATE),
				y: roundToDecimal(position.y - height / 2, PRECISION.COORDINATE),
			};
		},

		calcDimensions(overrides) {
			const { width, height } = calcSize(mergeDefaults(overrides));
			return { halfWidth: width / 2, halfHeight: height / 2 };
		},
	};
};
