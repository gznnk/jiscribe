import type { Dimensions } from "@jiscribe/geometry";

import { BODY_TEXT_SLOT_ID } from "../src/model/objects/types/text/TextSlot";
import type { ObjectDocDefinition } from "../src/plugin/ObjectDocDefinition";
import { calcFullBoxTextRegion } from "../src/plugin/ObjectDocTextRegion";

/**
 * Boxes a declared text region is sampled at. Several rather than one because a
 * type's inset can be taken from the shorter side or swap axes with the aspect
 * ratio — a stadium's caps sit left and right while it is wider than tall and
 * top and bottom once it is not — and the sample has to see both. The verdict is
 * the boxes' conjunction, so a type inset at some sizes and not at others counts
 * as not inset.
 */
const TEXT_REGION_PROBE_BOXES: readonly Dimensions[] = [
	{ width: 200, height: 100 },
	{ width: 100, height: 200 },
	{ width: 140, height: 140 },
];

/**
 * Whether the type gives up part of its own height to its outline: its declared
 * region sits inside the box vertically at every sampled size — a cylinder's
 * caps, a document's wavy foot, a container's header band. Only the vertical
 * extent is read, that being the only one `textVerticalBasis` swaps, so a type
 * inset on the sides alone counts as not inset. A type declaring no region is
 * drawn with its whole box, which the two bases name alike.
 *
 * @param definition - The type's text-region declaration; nothing outside it is read, so the answer is a fact about the type
 * @returns True when the declared region insets the box top and/or bottom at every probed size
 */
export const insetsBodyVertically = (
	definition: Pick<ObjectDocDefinition, "textRegion">,
): boolean => {
	const textRegion = definition.textRegion ?? calcFullBoxTextRegion;
	return TEXT_REGION_PROBE_BOXES.every((box) => {
		const region = textRegion(box, BODY_TEXT_SLOT_ID);
		if (region === null) {
			return false;
		}
		const boxTop = -box.height / 2;
		const boxBottom = box.height / 2;
		const regionBottom = region.y + region.height;
		return (
			region.y >= boxTop &&
			regionBottom <= boxBottom &&
			(region.y > boxTop || regionBottom < boxBottom)
		);
	});
};
