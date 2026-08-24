import { describe, expect, it } from "vitest";

import { MATRIX_TEXTS, REGION_FAMILIES } from "./support/regionFamilies";
import type { RichText } from "../../../model/objects/types/RichText";
import type { TextVerticalBasis } from "../../../model/objects/types/TextVerticalBasis";
import { TextVerticalBases } from "../../../model/objects/types/TextVerticalBasis";
import type { ObjectDocTextRegionCalculator } from "../../../plugin/ObjectDocTextRegion";
import { FALLBACK_FONT } from "../../layout/__tests__/support/fallbackFont";
import { layoutVisualLines } from "../../layout/layoutVisualLines";
import type { TextMeasureFont } from "../../measure/TextMeasureFont";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "../autoHeightComfortPadding";
import { calcAutoShapeHeight } from "../calcAutoShapeHeight";
import { calcTextContentBox } from "../calcTextContentBox";

/**
 * Whether a shape of this height holds the text with the comfort padding around
 * it, worked out from the region and one layout. The one fact both assertions
 * below rest on, and deliberately free of the search's own machinery — no
 * bisection, no walk, no turning a height down against a layout already run — so
 * that agreeing with it says something. The one thing it does borrow is the
 * memo, which is not an assumption but the definition: the text wraps by the
 * width alone.
 *
 * The frame basis is spelled out as the placement it is — the block centred on
 * the whole height, both its edges clearing the declared region by the padding —
 * rather than as the single allowance the search reduces that to, so the two are
 * not the same arithmetic twice.
 */
const createFitTest = (
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
	basis: TextVerticalBasis,
): ((
	shape: Record<string, unknown> & { width: number },
	height: number,
) => boolean) => {
	const textHeightByWidth = new Map<number, number>();
	const comfortPadding = font.fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM;
	return (shape, height) => {
		const region = textRegion({ ...shape, height }, "body");
		if (region === null) {
			return false;
		}
		const box = calcTextContentBox(region);
		let textHeight = textHeightByWidth.get(box.width);
		if (textHeight === undefined) {
			textHeight = layoutVisualLines(text, font, box.width).reduce(
				(total, line) => total + line.height,
				0,
			);
			textHeightByWidth.set(box.width, textHeight);
		}
		if (basis === "region") {
			return textHeight + comfortPadding * 2 <= box.height;
		}
		const frameBox = calcTextContentBox({
			x: region.x,
			y: -height / 2,
			width: region.width,
			height,
		});
		const blockTop =
			frameBox.y + (frameBox.height - textHeight) / 2 - comfortPadding;
		const blockBottom = blockTop + textHeight + comfortPadding * 2;
		return blockTop >= box.y && blockBottom <= box.y + box.height;
	};
};

/**
 * Widths the matrix runs at: narrow enough that a region taking its inset off
 * the height leaves almost nothing to wrap in, wide enough that the same region
 * barely notices, and the awkward sizes in between.
 */
const WIDTHS = [40, 88, 120, 200, 264, 400];

/** Type sizes: the smallest that reads, the shipped default, and one twice it. */
const FONT_SIZES = [10, 16, 32];

/**
 * How far the exhaustive walk is willing to climb. A region that takes its inset
 * off the height turns a narrow box into a very tall one — the delay family at
 * width 40 needs thousands of pixels for a wrapping text — and walking to that
 * one pixel at a time would cost more than the rest of the suite together. Cases
 * whose answer is above this are still checked for not overflowing; only the
 * "and nothing shorter would have done" half is left to the cases below it.
 */
const EXHAUSTIVE_WALK_CEILING = 700;

/** Every family crossed with every basis, which is the matrix each case runs. */
const REGION_FAMILY_BASES = REGION_FAMILIES.flatMap((family) =>
	TextVerticalBases.map((basis) => ({ ...family, basis })),
);

describe("the derived height is the smallest one the text fits in", () => {
	it.each(REGION_FAMILY_BASES)(
		"is what walking every height from one pixel up answers: $name on the $basis basis",
		({ textRegion, basis }) => {
			let checkedExhaustively = 0;
			let answered = 0;
			for (const { name, text } of MATRIX_TEXTS) {
				for (const width of WIDTHS) {
					for (const fontSize of FONT_SIZES) {
						const font = { ...FALLBACK_FONT, fontSize };
						const shape = { width, height: 0, headerHeight: 40 };
						const where = `${name} at ${width}px/${fontSize}px`;
						const holdsTextAt = createFitTest(text, font, textRegion, basis);
						const height = calcAutoShapeHeight(
							shape,
							text,
							font,
							textRegion,
							basis,
						);
						if (height === null) {
							// A region holding no text at all, and one whose height the box
							// does not move: no height fits, so there is none to check.
							expect(holdsTextAt(shape, EXHAUSTIVE_WALK_CEILING), where).toBe(
								false,
							);
							continue;
						}
						answered += 1;
						// The half that holds however tall the answer is.
						expect(holdsTextAt(shape, height), where).toBe(true);
						if (height > EXHAUSTIVE_WALK_CEILING) {
							continue;
						}
						for (let shorter = 1; shorter < height; shorter += 1) {
							if (holdsTextAt(shape, shorter)) {
								expect.fail(
									`${where}: answered ${height} but ${shorter} holds the text too`,
								);
							}
						}
						checkedExhaustively += 1;
					}
				}
			}
			// Guards the matrix itself: a ceiling put too low, or a region that
			// stopped answering, would leave the walk checking nothing and the test
			// still passing. A family that answers nowhere — the one that holds no
			// text at all — has nothing to check by the same token.
			expect(checkedExhaustively === 0 && answered > 0).toBe(false);
		},
	);
});
