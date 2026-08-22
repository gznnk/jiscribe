import type { Dimensions } from "@jiscribe/geometry";

import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "./autoHeightComfortPadding";
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
 * wrapped text with room to breathe around it: the height a document that leaves
 * `height` out is drawn at (`supportsAutoHeight`). The room is
 * {@link AUTO_HEIGHT_COMFORT_PADDING_EM} of the body's size above and below,
 * which is what keeps a one-line label from coming out as a 7:1 slab.
 *
 * The region is the type's own declaration (`ObjectDocDefinition.textRegion`)
 * minus the text box's padding, so the width the text wraps at is whatever that
 * region leaves at the height being considered — which is why a stadium's caps
 * and a document's wavy foot are accounted for rather than approximated. The
 * region is an arbitrary function of the height, so it is not inverted but
 * searched: the height climbs until the text fits and is then bisected, on the
 * assumption that a taller shape holds what a shorter one held.
 *
 * That assumption fails for a type whose region loses more width than it gains
 * height as the box grows — a stadium's caps — which holds the text over a band
 * of heights rather than from one height upwards, so the bisected height is
 * taken as a ceiling and every height below it is walked from the bottom. The
 * first that fits is the shortest whatever the region does, which is what makes
 * the answer the smallest one rather than merely one the text fits in.
 *
 * The heights are far more numerous than the layouts they cost. Wrapping depends
 * on the region's width alone, so every height leaving the same width shares one
 * layout — a type whose region keeps its width, which is most of them, measures
 * its text exactly once however many heights are tried. Where the width does
 * move, a height is turned down against the layouts already run rather than by
 * running another wherever those are enough to say so, which is what leaves the
 * walk cheaper than the bisection it backs up.
 *
 * @param shape - The shape's width and the fields its region reads; its `height` is ignored (see {@link AutoHeightShape})
 * @param text - The whole text, authored newlines included; an empty text still needs one empty line, so the answer is never below the height that holds a single line
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where the lines break, and its `fontSize` is the em the comfort padding is charged in whatever the runs set
 * @param textRegion - The type's text-region calculator, called once per height the search tries
 * @returns The height in whole pixels, or null when the type's box does not hold the text at all (the calculator answering `null`) and when no height up to 1,000,000px fits it
 */
export const calcAutoShapeHeight = (
	shape: AutoHeightShape,
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
): number | null => {
	/**
	 * Height the text takes when wrapped at a content width, one entry per width
	 * the search has met. Lives for this call alone: it is the repetition within
	 * one search that it takes out, the text and the font being fixed for it.
	 */
	const textHeightByWidth = new Map<number, number>();

	const calcTextHeight = (contentWidth: number): number => {
		const known = textHeightByWidth.get(contentWidth);
		if (known !== undefined) {
			return known;
		}
		const measured = layoutVisualLines(text, font, contentWidth).reduce(
			(total, line) => total + line.height,
			0,
		);
		textHeightByWidth.set(contentWidth, measured);
		return measured;
	};

	/**
	 * Whether every line of this text is drawn at the same height, which is what
	 * makes its total height fall as the width grows: the lines are then only ever
	 * merged by a wider box, never made taller by the run that moves onto them. A
	 * text carrying its own type sizes and families breaks that — a serif run
	 * joining a line raises it by more than the line it left, so the total can go
	 * *up* by a fraction of a pixel as the box widens — so such a text is measured
	 * at every width rather than bounded ({@link calcTextHeightFloor}).
	 */
	const isUniformlyStyled =
		typeof text === "string" ||
		text.every(
			(run) =>
				run.fontSize === undefined &&
				run.fontFamily === undefined &&
				run.fontWeight === undefined &&
				run.fontStyle === undefined,
		);

	/**
	 * A height the text cannot come in under at `contentWidth`, read off the
	 * layouts already run rather than by running another: for a text of one type
	 * size and family, wrapping never turns two lines into one as the width
	 * shrinks, so any width already laid out that is no narrower than this one
	 * bounds it from below, and the narrowest of those bounds it hardest. 0 where
	 * none of them do and for a text whose lines differ in height, which still
	 * rules out a box too short for the padding on its own.
	 *
	 * @param contentWidth - Width to bound the text's height at, in px
	 */
	const calcTextHeightFloor = (contentWidth: number): number => {
		if (!isUniformlyStyled) {
			return 0;
		}
		let floor = 0;
		let floorWidth = Infinity;
		for (const [width, height] of textHeightByWidth) {
			if (width >= contentWidth && width < floorWidth) {
				floorWidth = width;
				floor = height;
			}
		}
		return floor;
	};

	/** Room asked for above and below the text ({@link AUTO_HEIGHT_COMFORT_PADDING_EM}). */
	const comfortPadding = font.fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM;

	/**
	 * Whether the text and its comfort padding fit at this height, or null where
	 * the box holds no text. The padding is charged here rather than added to the
	 * answer, so that the height that comes back is one whose own region — the
	 * narrower one a stadium's caps leave at that height, say — holds the text
	 * with the padding still around it. Added afterwards it would be room measured
	 * against a region the shape no longer has at that height.
	 */
	const fitsAt = (height: number): boolean | null => {
		const region = textRegion({ ...shape, height }, BODY_TEXT_SLOT_ID);
		if (region === null) {
			return null;
		}
		const box = calcTextContentBox(region);
		// Turned down without a layout wherever the layouts already run are enough
		// to say so ({@link calcTextHeightFloor}). This is what keeps the walk below
		// affordable on a region that leaves a different width at every height, and
		// therefore shares no layout between them.
		if (calcTextHeightFloor(box.width) + comfortPadding * 2 > box.height) {
			return false;
		}
		return calcTextHeight(box.width) + comfortPadding * 2 <= box.height;
	};

	// Climb by doubling from a single pixel, so a tall text is reached in a few
	// tries, and bisect what that brackets.
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

	// What that settles on is taken as a ceiling rather than as the answer, and
	// every height below it is walked from the bottom. Where the region keeps its
	// width the ceiling is already the answer and the walk simply arrives at it;
	// where the region narrows as the box grows, the walk is what finds the band
	// of fitting heights the doubling stepped over.
	for (let height = 1; height < fitting; height += 1) {
		const fits = fitsAt(height);
		if (fits === null) {
			return null;
		}
		if (fits) {
			return height;
		}
	}
	return fitting;
};
