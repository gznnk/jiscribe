import type { Dimensions } from "@jiscribe/geometry";

import { calcTextContentBox } from "./calcTextContentBox";
import type { RichText } from "../../model/objects/types/RichText";
import type { ObjectDocTextRegionCalculator } from "../../plugin/ObjectDocTextRegion";
import { layoutVisualLines } from "../layout/layoutVisualLines";
import type { TextMeasureFont } from "../measure/TextMeasureFont";
import { BODY_TEXT_SLOT_ID } from "../style/textSlotId";

/**
 * A shape as {@link calcAutoShapeHeight} needs to see it: the width its text
 * wraps in, plus whatever else its own text region reads — the callout's `tail`,
 * the container's `headerHeight`. Any `height` on it is ignored, that being the
 * answer.
 */
export type AutoHeightShape = Dimensions & Readonly<Record<string, unknown>>;

/**
 * Tallest box the search will consider, in local pixels. Reaching it means the
 * text never fits however tall the shape is drawn — a region whose height does
 * not grow with the box (the container's header band) is the case in hand — and
 * the search gives up rather than climbing forever.
 */
const MAX_AUTO_SHAPE_HEIGHT = 1_000_000;

/**
 * The shortest whole-pixel height at which a shape's text region holds the
 * wrapped text: the height a document that leaves `height` out is drawn at
 * (`supportsAutoHeight`).
 *
 * The region is the type's own declaration (`ObjectDocDefinition.textRegion`)
 * minus the text box's padding, so the width the text wraps at is whatever that
 * region leaves at the height being considered — which is why a stadium's caps
 * and a document's wavy foot are accounted for rather than approximated. The
 * region is an arbitrary function of the height, so it is not inverted but
 * searched: the height is doubled until the text fits and then bisected, on the
 * assumption that a taller shape holds what a shorter one held.
 *
 * Where that assumption does not hold — a type whose region loses more width
 * than it gains height as the box grows — the answer is still a height the text
 * fits in, but not necessarily the smallest one. The height that comes back is
 * never one the text overflows.
 *
 * @param shape - The shape's width and the fields its region reads; its `height` is ignored (see {@link AutoHeightShape})
 * @param text - The whole text, authored newlines included; an empty text still needs one empty line, so the answer is never below the height that holds a single line
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where the lines break
 * @param textRegion - The type's text-region calculator, called once per height the search tries
 * @returns The height in whole pixels, or null when the type's box does not hold the text at all (the calculator answering `null`) and when no height up to 1,000,000px fits it
 */
export const calcAutoShapeHeight = (
	shape: AutoHeightShape,
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
): number | null => {
	/** Whether the text fits at this height, or null where the box holds no text. */
	const fitsAt = (height: number): boolean | null => {
		const region = textRegion({ ...shape, height }, BODY_TEXT_SLOT_ID);
		if (region === null) {
			return null;
		}
		const box = calcTextContentBox(region);
		const lines = layoutVisualLines(text, font, box.width);
		return lines.reduce((total, line) => total + line.height, 0) <= box.height;
	};

	// Climb by doubling from a single pixel, so a tall text is reached in a few
	// measurements and a short one settles without any bisection at all.
	let tooShort = 0;
	let fitting = 1;
	for (;;) {
		const fits = fitsAt(fitting);
		if (fits === null) {
			return null;
		}
		if (fits) {
			break;
		}
		if (fitting >= MAX_AUTO_SHAPE_HEIGHT) {
			return null;
		}
		tooShort = fitting;
		fitting = Math.min(fitting * 2, MAX_AUTO_SHAPE_HEIGHT);
	}

	// `tooShort` is known not to hold the text and `fitting` is known to hold it,
	// which is what makes the answer a fitting height whatever the region does in
	// between.
	while (fitting - tooShort > 1) {
		const middle = Math.floor((tooShort + fitting) / 2);
		const fits = fitsAt(middle);
		if (fits === null) {
			return null;
		}
		if (fits) {
			fitting = middle;
		} else {
			tooShort = middle;
		}
	}
	return fitting;
};
