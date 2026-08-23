import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { TextVerticalBasis } from "../../../model/objects/types/TextVerticalBasis";
import type { ObjectDocTextRegionCalculator } from "../../../plugin/ObjectDocTextRegion";
import {
	calcFullBoxTextRegion,
	calcOutsideBoxTextRegion,
} from "../../../plugin/ObjectDocTextRegion";
import {
	FALLBACK_CHAR_WIDTH,
	FALLBACK_FONT,
} from "../../layout/__tests__/support/fallbackFont";
import { layoutVisualLines } from "../../layout/layoutVisualLines";
import { measureUnder } from "../../measure/__tests__/support/measureUnder";
import type { TextMeasureFont } from "../../measure/TextMeasureFont";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "../autoHeightComfortPadding";
import { calcAutoShapeHeight } from "../calcAutoShapeHeight";
import { calcTextContentBox } from "../calcTextContentBox";

/** Padding the text box adds around the text, left+right and top+bottom. */
const HORIZONTAL_PADDING = 6 * 2;
const VERTICAL_PADDING = 2 * 2;

/** Room a derived height leaves above and below its text together, at `fontSize`. */
const comfortPaddingAt = (fontSize: number): number =>
	fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2;

/** {@link comfortPaddingAt} for {@link FALLBACK_FONT}, which is what most cases run at. */
const COMFORT_PADDING = comfortPaddingAt(10);

/** Line box of {@link FALLBACK_FONT}: its size times the shared line height. */
const LINE_HEIGHT = 10 * 1.5;

/** Box width fitting exactly `charCount` characters of {@link FALLBACK_FONT}. */
const widthFor = (charCount: number): number =>
	charCount * FALLBACK_CHAR_WIDTH + HORIZONTAL_PADDING;

/** Lines the text is drawn as inside the region a shape of this height leaves. */
const heightOfTextAt = (
	shapeHeight: number,
	text: string,
	textRegion: ObjectDocTextRegionCalculator,
	width: number,
): number => {
	const region = textRegion({ width, height: shapeHeight }, "body");
	const box = calcTextContentBox(region as Rect);
	return layoutVisualLines(text, FALLBACK_FONT, box.width).reduce(
		(total, line) => total + line.height,
		0,
	);
};

describe("calcAutoShapeHeight", () => {
	it("answers the height whose region holds the wrapped lines and their room", () => {
		// Ten characters of room, four words of four: two words per line, two lines.
		const width = widthFor(10);
		const height = calcAutoShapeHeight(
			{ width, height: 0 },
			"aaaa bbbb cccc dddd",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(LINE_HEIGHT * 2 + VERTICAL_PADDING + COMFORT_PADDING);
	});

	it("sizes an empty text to a single line, which is the floor of the answer", () => {
		const height = calcAutoShapeHeight(
			{ width: widthFor(10), height: 0 },
			"",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(LINE_HEIGHT + VERTICAL_PADDING + COMFORT_PADDING);
	});

	it("leaves the room above and below in proportion to the type size", () => {
		const heightAt = (fontSize: number): number | null =>
			calcAutoShapeHeight(
				{ width: 400, height: 0 },
				"one line",
				{ ...FALLBACK_FONT, fontSize },
				calcFullBoxTextRegion,
			);
		// The same line at twice the size leaves twice the room, so the difference
		// between the two answers is a line box and a comfort band over again.
		expect(heightAt(20)! - heightAt(10)!).toBe(
			LINE_HEIGHT + comfortPaddingAt(10),
		);
	});

	it("ignores the height it is handed, that being the answer", () => {
		const shape = { width: widthFor(10) };
		const fromTall = calcAutoShapeHeight(
			{ ...shape, height: 4000 },
			"aaaa bbbb",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		const fromFlat = calcAutoShapeHeight(
			{ ...shape, height: 0 },
			"aaaa bbbb",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(fromTall).toBe(fromFlat);
	});

	it("rounds up to a whole pixel, never down into an overflow", () => {
		// Half a pixel of leading per line puts the exact answer between two pixels:
		// two line boxes and the comfort band come to 53.5 at this type size.
		const font = { ...FALLBACK_FONT, fontSize: 11 };
		const height = calcAutoShapeHeight(
			{ width: 200, height: 0 },
			"first line\nsecond line",
			font,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(
			Math.ceil(11 * 1.5 * 2 + VERTICAL_PADDING + comfortPaddingAt(11)),
		);
		expect(Number.isInteger(height)).toBe(true);
	});

	it("converges on the smallest fitting height: one less overflows", () => {
		const width = widthFor(12);
		const text = "aaaa bbbb cccc dddd eeee ffff";
		const height = calcAutoShapeHeight(
			{ width, height: 0 },
			text,
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(height).not.toBeNull();
		const fits = (shapeHeight: number): boolean =>
			heightOfTextAt(shapeHeight, text, calcFullBoxTextRegion, width) <=
			shapeHeight - VERTICAL_PADDING - COMFORT_PADDING;
		expect(fits(height!)).toBe(true);
		expect(fits(height! - 1)).toBe(false);
	});

	it("answers null where the type's box does not hold its text at all", () => {
		expect(
			calcAutoShapeHeight(
				{ width: 200, height: 0 },
				"anything",
				FALLBACK_FONT,
				calcOutsideBoxTextRegion,
			),
		).toBeNull();
	});

	it("answers null where no height fits, a region of its own height here", () => {
		// A header band: as tall as the text box's padding whatever the shape does,
		// so a line of text never fits and the search reaches its ceiling.
		const headerBand: ObjectDocTextRegionCalculator = ({ width }) => ({
			x: -width / 2,
			y: 0,
			width,
			height: VERTICAL_PADDING,
		});
		expect(
			calcAutoShapeHeight(
				{ width: 200, height: 0 },
				"anything",
				FALLBACK_FONT,
				headerBand,
			),
		).toBeNull();
	});

	it("still answers a fitting height where the region narrows as the box grows", () => {
		// A stadium's caps: the taller the box, the less width is left to wrap in,
		// which is the case the search's monotonicity assumption is weakest on.
		const width = widthFor(24);
		const text = "aaaa bbbb cccc dddd";
		const cappedBox: ObjectDocTextRegionCalculator = (doc) => ({
			x: -doc.width / 2 + doc.height / 2,
			y: -doc.height / 2,
			width: Math.max(0, doc.width - doc.height),
			height: doc.height,
		});
		const height = calcAutoShapeHeight(
			{ width, height: 0 },
			text,
			FALLBACK_FONT,
			cappedBox,
		);
		expect(height).not.toBeNull();
		expect(heightOfTextAt(height!, text, cappedBox, width)).toBeLessThanOrEqual(
			height! - VERTICAL_PADDING - COMFORT_PADDING,
		);
	});

	it("reads the fields the region depends on off the shape it is given", () => {
		// A shape whose region is inset by a field of its own: a wider inset leaves
		// less room to wrap in, so it must reach the answer.
		const insetRegion: ObjectDocTextRegionCalculator = (doc) => {
			const inset = (doc as { inset?: number }).inset ?? 0;
			return {
				x: -doc.width / 2 + inset,
				y: -doc.height / 2,
				width: doc.width - inset * 2,
				height: doc.height,
			};
		};
		const text = "aaaa bbbb cccc dddd";
		const roomy = calcAutoShapeHeight(
			{ width: widthFor(20), height: 0, inset: 0 },
			text,
			FALLBACK_FONT,
			insetRegion,
		);
		const pinched = calcAutoShapeHeight(
			{ width: widthFor(20), height: 0, inset: FALLBACK_CHAR_WIDTH * 5 },
			text,
			FALLBACK_FONT,
			insetRegion,
		);
		expect(roomy).not.toBeNull();
		expect(pinched).toBeGreaterThan(roomy!);
	});
});

describe("calcAutoShapeHeight on the frame basis", () => {
	/** A db's band top and bottom, off centre because the two differ. */
	const bandedRegion: ObjectDocTextRegionCalculator = ({ width, height }) => ({
		x: -width / 2,
		y: -height / 2 + height * 0.2,
		width,
		height: height * 0.7,
	});

	/** A card's corner cut, taken off the top alone. */
	const cornerCutRegion: ObjectDocTextRegionCalculator = ({
		width,
		height,
	}) => {
		const cut = Math.min(width, height) * 0.2;
		return { x: -width / 2, y: -height / 2 + cut, width, height: height - cut };
	};

	const heightOnBasis = (
		textRegion: ObjectDocTextRegionCalculator,
		basis: TextVerticalBasis | undefined,
	): number | null =>
		calcAutoShapeHeight(
			{ width: widthFor(20), height: 0 },
			"aaaa bbbb cccc dddd",
			FALLBACK_FONT,
			textRegion,
			basis,
		);

	it("derives one height either way where the region sits on the box's centre", () => {
		// A constant inset on top and bottom alike: the whole box and a symmetric
		// band both centre the region, so centring the block on the frame puts it
		// exactly where the region basis already had it.
		const symmetricRegion: ObjectDocTextRegionCalculator = ({
			width,
			height,
		}) => ({
			x: -width / 2,
			y: -height / 2 + height * 0.15,
			width,
			height: height * 0.7,
		});
		expect(heightOnBasis(calcFullBoxTextRegion, "frame")).toBe(
			heightOnBasis(calcFullBoxTextRegion, undefined),
		);
		expect(heightOnBasis(symmetricRegion, "frame")).toBe(
			heightOnBasis(symmetricRegion, undefined),
		);
	});

	it.each([
		{ name: "a band deeper at the top (db)", textRegion: bandedRegion },
		{ name: "a corner cut off the top (card)", textRegion: cornerCutRegion },
	])(
		"derives a taller box where the region sits off it: $name",
		({ textRegion }) => {
			const onFrame = heightOnBasis(textRegion, "frame");
			const onRegion = heightOnBasis(textRegion, undefined);
			expect(onRegion).not.toBeNull();
			expect(onFrame).toBeGreaterThan(onRegion!);
		},
	);

	it("leaves the centred block inside the region with its room, and nothing shorter does", () => {
		const text = "aaaa bbbb cccc dddd";
		const width = widthFor(20);
		const height = calcAutoShapeHeight(
			{ width, height: 0 },
			text,
			FALLBACK_FONT,
			bandedRegion,
			"frame",
		);
		expect(height).not.toBeNull();
		// The block is centred on the whole height and must clear the declared
		// region's own content box by the comfort padding on both sides.
		const clearsRegionAt = (shapeHeight: number): boolean => {
			const region = bandedRegion({ width, height: shapeHeight }, "body")!;
			const regionBox = calcTextContentBox(region);
			const textHeight = heightOfTextAt(shapeHeight, text, bandedRegion, width);
			const blockTop = -textHeight / 2;
			return (
				blockTop - COMFORT_PADDING / 2 >= regionBox.y &&
				blockTop + textHeight + COMFORT_PADDING / 2 <=
					regionBox.y + regionBox.height
			);
		};
		expect(clearsRegionAt(height!)).toBe(true);
		expect(clearsRegionAt(height! - 1)).toBe(false);
	});
});

describe("calcAutoShapeHeight sharing one layout between heights", () => {
	// One measurer is built per styled run per layout pass, and the text below is
	// one run, so the count is the number of passes. The widths are the estimate's
	// own, so counting changes no height.
	let layoutPasses = 0;
	measureUnder({
		source: "estimate",
		createMeasurer: (font: TextMeasureFont) => {
			layoutPasses += 1;
			return (measured) => measured.length * font.fontSize * 0.6;
		},
	});

	it("lays the text out once where the region keeps its width", () => {
		layoutPasses = 0;
		let regionCalls = 0;
		const countedFullBox: ObjectDocTextRegionCalculator = (doc) => {
			regionCalls += 1;
			return calcFullBoxTextRegion(doc);
		};

		calcAutoShapeHeight(
			{ width: widthFor(12), height: 0 },
			"aaaa bbbb cccc dddd eeee ffff gggg hhhh",
			FALLBACK_FONT,
			countedFullBox,
		);

		expect(regionCalls).toBeGreaterThan(1);
		expect(layoutPasses).toBe(1);
	});
});
