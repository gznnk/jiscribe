import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { BODY_TEXT_SLOT_ID } from "../text/style/textSlotId";

/**
 * What {@link hasInsetTextRegion} reads off a type: the region declaration that
 * decides the answer, plus the features that say whether there is a body to
 * place. A whole `ObjectDocDefinition` is one; so is the `{ features, textRegion
 * }` a definition is being assembled from.
 */
export type InsetTextRegionDeclaration = Pick<
	ObjectDocDefinition,
	"features" | "textRegion"
>;

/**
 * Boxes the declared region is measured at. Several rather than one because a
 * type's inset can be taken from the shorter side or swap axes with the aspect
 * ratio — a stadium's caps sit left and right while it is wider than tall and
 * top and bottom once it is not — and the sample has to see both. The answer is
 * the sampled boxes' conjunction: a type inset at some sizes and not at others
 * answers false, so the switch is offered only where it always moves the body.
 */
const INSET_TEXT_REGION_PROBE_BOXES: readonly Dimensions[] = [
	{ width: 200, height: 100 },
	{ width: 100, height: 200 },
	{ width: 140, height: 140 },
];

/**
 * Whether the type places its one body inside its own box at all: its declared
 * region answers a rect that sits within the box vertically at every sampled
 * size. Weaker than {@link hasInsetTextRegion} — a full-box region passes here
 * (asking for the frame basis on it is already satisfied, not ignored) — and
 * false for a type that draws its label outside its outline or declares no
 * region, where a basis has nothing to place and a write of one could only sit
 * in the document looking as though it took effect.
 *
 * @param definition - The type's declarations (see {@link InsetTextRegionDeclaration}); sampled at the same boxes as {@link hasInsetTextRegion}
 * @returns True when the declared region stays within the box vertically at every sampled size
 */
export const holdsBodyInsideBox = (
	definition: InsetTextRegionDeclaration,
): boolean => {
	const { features, textRegion } = definition;
	if (features.text !== "body" || textRegion === undefined) {
		return false;
	}
	return INSET_TEXT_REGION_PROBE_BOXES.every((box) => {
		const region = textRegion(box, BODY_TEXT_SLOT_ID);
		if (region === null) {
			return false;
		}
		return (
			region.y >= -box.height / 2 && region.y + region.height <= box.height / 2
		);
	});
};

/**
 * Whether the type gives up part of its own height to its outline: its declared
 * region (`ObjectDocDefinition.textRegion`) sits **inside** the box vertically —
 * a cylinder's caps, a document's wavy foot, a container's header band.
 *
 * This is exactly the condition under which `textVerticalBasis` changes where a
 * body is drawn, so it is what decides whether the switch between the two bases
 * is worth offering. Only the vertical extent is read, that being the only one
 * the basis swaps (`applyTextVerticalBasis`): a type inset on the sides alone —
 * a stadium's caps, a parallelogram's slant — would take the switch nowhere and
 * answers false. So does a type whose region lies outside the box (a label drawn
 * under the outline), where the switch would drag the label onto the drawing
 * rather than move it within its own shape.
 *
 * @param definition - The type's declarations (see {@link InsetTextRegionDeclaration}); nothing outside them is read, and the region is sampled at a few representative boxes rather than solved (see {@link INSET_TEXT_REGION_PROBE_BOXES}), so the answer is a fact about the type
 * @returns True when the two vertical bases put this type's body in different places at every sampled size
 */
export const hasInsetTextRegion = (
	definition: InsetTextRegionDeclaration,
): boolean => {
	const { features, textRegion } = definition;
	// Only a single body is placed against the shape itself; named slots carry no
	// shape-wide basis to switch (TextStyleDoc).
	if (features.text !== "body" || textRegion === undefined) {
		return false;
	}
	return INSET_TEXT_REGION_PROBE_BOXES.every((box) => {
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
