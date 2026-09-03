import type { Dimensions } from "@jiscribe/geometry";

import { applyTextVerticalBasis } from "./applyTextVerticalBasis";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "./autoHeightComfortPadding";
import { calcTextContentBox } from "./calcTextContentBox";
import type { RichText } from "../../model/objects/types/RichText";
import type { TextVerticalBasis } from "../../model/objects/types/TextVerticalBasis";
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
 * Tallest box the search will consider, in local pixels. Reaching it means no
 * probed height fit however tall the shape is drawn — a region whose height
 * does not grow with the box (the container's header band) is the case in hand
 * — and the climb stops rather than doubling forever; what remains after it is
 * the band rescue, not more climbing.
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
 * the answer the smallest one rather than merely one the text fits in. A band
 * lying wholly between two of the climb's probes never brackets a ceiling at
 * all, and is rescued instead by searching beside the probe that came closest
 * ({@link rescueBandBetweenProbes} inside).
 *
 * The heights are far more numerous than the layouts they cost. Wrapping depends
 * on the region's width alone, so every height leaving the same width shares one
 * layout — a type whose region keeps its width, which is most of them, measures
 * its text exactly once however many heights are tried. Where the width does
 * move, a height is turned down against the layouts already run rather than by
 * running another wherever those are enough to say so, which is what leaves the
 * walk cheaper than the bisection it backs up.
 *
 * A shape placing its body on its whole height (`textVerticalBasis: "frame"`) is
 * derived against that placement: the block is centred on the frame, and the
 * height asked for is the one that still leaves it inside the declared region
 * with the same room around it ({@link calcTextRoom}). Since the region need
 * not sit on the frame's centre, the two sides are held apart and the tighter one
 * decides — which is what makes such a shape come out taller than the same text
 * on the region basis rather than merely placed differently in the same box.
 *
 * @param shape - The shape's width and the fields its region reads; its `height` is ignored (see {@link AutoHeightShape})
 * @param text - The whole text, authored newlines included; an empty text still needs one empty line, so the answer is never below the height that holds a single line
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where the lines break, and its `fontSize` is the em the comfort padding is charged in whatever the runs set
 * @param textRegion - The type's text-region calculator, called once per height the search tries
 * @param basis - The shape's `textVerticalBasis`; `undefined` — the field absent, which is every document written before it existed — derives against the declared region, and equals `"frame"`'s answer for a region that sits on the box's centre
 * @returns The height in whole pixels, or null when no height up to 1,000,000px fits the text — a height at which the calculator answers `null` merely does not fit, so a region existing only above some minimum height is searched through rather than given up on
 */
export const calcAutoShapeHeight = (
	shape: AutoHeightShape,
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
	basis?: TextVerticalBasis,
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
	 * The room a shape of this height leaves the text block and its comfort
	 * padding, and the width the text wraps at to fill it — or null where the box
	 * holds no text.
	 *
	 * On the region basis that is the content box the region leaves, so the
	 * padding is charged against the very region the shape has at that height —
	 * the narrower one a stadium's caps leave, say — rather than added to the
	 * answer afterwards, where it would be room measured against a region the
	 * shape no longer has.
	 *
	 * On the frame basis the block is centred on the shape's whole height while
	 * the room it must stay inside is still the declared region's, so the region's
	 * two edges are measured from that centre separately and the nearer one sets
	 * the room: a block filling it reaches neither edge, whichever side the region
	 * sits off centre on. A region centred on the box makes the two equal and the
	 * room the region basis's own, which is why a symmetric type derives one
	 * height either way.
	 *
	 * Centred means `verticalAlign: "middle"`, which this derivation assumes: a
	 * frame-basis body aligned `"top"` or `"bottom"` starts at the frame's edge, a
	 * fixed distance past the region's, so no height keeps it inside the region
	 * and none is derived for it here — `diagnose` is what reports that placement
	 * (its decoration-overlap check reads the alignment).
	 */
	const calcTextRoom = (height: number): Dimensions | null => {
		const region = textRegion({ ...shape, height }, BODY_TEXT_SLOT_ID);
		if (region === null) {
			return null;
		}
		const regionBox = calcTextContentBox(region);
		if (basis !== "frame") {
			return { width: regionBox.width, height: regionBox.height };
		}
		const frameBox = calcTextContentBox(
			applyTextVerticalBasis(region, { ...shape, height }, basis),
		);
		const blockCenter = frameBox.y + frameBox.height / 2;
		const above = blockCenter - regionBox.y;
		const below = regionBox.y + regionBox.height - blockCenter;
		// Negative where the region does not reach the centre at all, which is a
		// height nothing fits at rather than a case to clamp away.
		return { width: frameBox.width, height: Math.min(above, below) * 2 };
	};

	/**
	 * How far the text and its comfort padding overshoot the room at this height:
	 * at or below zero the height fits. Infinity where the calculator answers no
	 * region — a height that does not fit rather than a verdict on the type (a
	 * plugin's region may answer null below its minimum height and a box above
	 * it). A region squeezed to no width is *not* Infinity: the layout still
	 * answers there (a character per line, an empty text its one line), and an
	 * empty text genuinely fits a width nothing else would.
	 *
	 * The sign is exact either way; `exact` decides the positive magnitudes.
	 * Without it a positive answer may be the lower bound
	 * {@link calcTextHeightFloor} settles the sign with, skipping a layout —
	 * right wherever only the sign is read (the bisection, the walk), and wrong
	 * wherever shortfalls are *compared*: the climb feeds the rescue's
	 * closest-probe choice, which a lower bound of 0 + padding at a tiny height
	 * would win over the genuinely nearest miss.
	 */
	const calcFitShortfall = (height: number, exact = false): number => {
		const room = calcTextRoom(height);
		if (room === null) {
			return Infinity;
		}
		if (!exact) {
			const floorShortfall =
				calcTextHeightFloor(room.width) + comfortPadding * 2 - room.height;
			if (floorShortfall > 0) {
				return floorShortfall;
			}
		}
		return calcTextHeight(room.width) + comfortPadding * 2 - room.height;
	};

	/**
	 * The rescue for a band of fitting heights the doubling stepped over whole:
	 * every probe failed, yet a height between two of them may fit (a region that
	 * loses width as the box grows — a delay's cap — holds its text over a band,
	 * not from one height upwards). On the one-band reading of that shape — the
	 * shortfall falls, bottoms out and rises again — the band lies beside the
	 * probe that came closest, so that neighbourhood is narrowed onto the dip
	 * and, where the dip reaches zero, bisected back for the band's low edge. A
	 * shortfall shaped in more bands than one can still hide from this, and the
	 * answer is then null exactly as it was before the rescue existed.
	 *
	 * @param climbShortfalls - Every probe the climb tried with the shortfall it answered, in climbing order
	 */
	const rescueBandBetweenProbes = (
		climbShortfalls: readonly [height: number, shortfall: number][],
	): number | null => {
		let closestProbe: [number, number] | null = null;
		for (const probe of climbShortfalls) {
			if (
				Number.isFinite(probe[1]) &&
				(closestProbe === null || probe[1] < closestProbe[1])
			) {
				closestProbe = probe;
			}
		}
		// Nowhere did the box hold text at all; there is no dip to look beside.
		if (closestProbe === null) {
			return null;
		}
		// The neighbouring probes both failed, so they anchor the search — every
		// move below keeps both ends at heights known not to fit.
		let unfitLow = Math.max(1, Math.floor(closestProbe[0] / 2));
		let unfitHigh = Math.min(closestProbe[0] * 2, MAX_AUTO_SHAPE_HEIGHT);
		let fittingHeight: number | null = null;
		while (unfitHigh - unfitLow > 2) {
			const third = Math.floor((unfitHigh - unfitLow) / 3);
			const lowProbe = unfitLow + third;
			const highProbe = unfitHigh - third;
			// Exact, as in the climb: the narrowing compares magnitudes.
			const lowShortfall = calcFitShortfall(lowProbe, true);
			if (lowShortfall <= 0) {
				fittingHeight = lowProbe;
				break;
			}
			const highShortfall = calcFitShortfall(highProbe, true);
			if (highShortfall <= 0) {
				fittingHeight = highProbe;
				break;
			}
			if (lowShortfall < highShortfall) {
				unfitHigh = highProbe;
			} else {
				unfitLow = lowProbe;
			}
		}
		if (fittingHeight === null) {
			for (let height = unfitLow + 1; height < unfitHigh; height += 1) {
				if (calcFitShortfall(height) <= 0) {
					fittingHeight = height;
					break;
				}
			}
		}
		if (fittingHeight === null) {
			return null;
		}
		// The band's low edge: on the falling flank the fit predicate is monotone,
		// so it is bisected the way the primary search bisects its ceiling.
		let tooShort = unfitLow;
		let fitting = fittingHeight;
		while (fitting - tooShort > 1) {
			const middle = Math.floor((tooShort + fitting) / 2);
			if (calcFitShortfall(middle) <= 0) {
				fitting = middle;
			} else {
				tooShort = middle;
			}
		}
		return fitting;
	};

	// Climb by doubling from a single pixel, so a tall text is reached in a few
	// tries, and bisect what that brackets. Exact shortfalls (a couple dozen
	// layouts at most), because a missed bracket hands them to the rescue's
	// closest-probe comparison.
	const climbShortfalls: [height: number, shortfall: number][] = [];
	let tooShort = 0;
	let fitting = 1;
	let bracketed = false;
	for (;;) {
		const shortfall = calcFitShortfall(fitting, true);
		if (shortfall <= 0) {
			bracketed = true;
			break;
		}
		climbShortfalls.push([fitting, shortfall]);
		if (fitting >= MAX_AUTO_SHAPE_HEIGHT) {
			break;
		}
		tooShort = fitting;
		fitting = Math.min(fitting * 2, MAX_AUTO_SHAPE_HEIGHT);
	}
	if (!bracketed) {
		return rescueBandBetweenProbes(climbShortfalls);
	}
	while (fitting - tooShort > 1) {
		const middle = Math.floor((tooShort + fitting) / 2);
		if (calcFitShortfall(middle) <= 0) {
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
		if (calcFitShortfall(height) <= 0) {
			return height;
		}
	}
	return fitting;
};
