import type { Rect } from "@jiscribe/geometry";
import { afterEach, describe, expect, it } from "vitest";

import type { RichText } from "../../../model/objects/types/RichText";
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
import type { TextMeasureFont } from "../../measure/TextMeasureFont";
import { setTextWidthMeasurerFactory } from "../../measure/textWidthMeasurer";
import type { AutoHeightShape } from "../calcAutoShapeHeight";
import { calcAutoShapeHeight } from "../calcAutoShapeHeight";
import { calcTextContentBox } from "../calcTextContentBox";

/** Padding the text box adds around the text, left+right and top+bottom. */
const HORIZONTAL_PADDING = 6 * 2;
const VERTICAL_PADDING = 2 * 2;

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
	it("answers the height whose region holds the wrapped lines exactly", () => {
		// Ten characters of room, four words of four: two words per line, two lines.
		const width = widthFor(10);
		const height = calcAutoShapeHeight(
			{ width, height: 0 },
			"aaaa bbbb cccc dddd",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(LINE_HEIGHT * 2 + VERTICAL_PADDING);
	});

	it("sizes an empty text to a single line, which is the floor of the answer", () => {
		const height = calcAutoShapeHeight(
			{ width: widthFor(10), height: 0 },
			"",
			FALLBACK_FONT,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(LINE_HEIGHT + VERTICAL_PADDING);
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
		// Half a pixel of leading per line puts the exact answer between two pixels.
		const font = { ...FALLBACK_FONT, fontSize: 11 };
		const height = calcAutoShapeHeight(
			{ width: 200, height: 0 },
			"one line",
			font,
			calcFullBoxTextRegion,
		);
		expect(height).toBe(Math.ceil(11 * 1.5 + VERTICAL_PADDING));
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
			shapeHeight - VERTICAL_PADDING;
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
			height! - VERTICAL_PADDING,
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

/**
 * The search as it was written before the layouts within one call were shared:
 * every height it tries lays the text out again. Kept here as the answer to
 * measure the current implementation against, the sharing being an optimisation
 * that must not move a single height.
 */
const calcAutoShapeHeightPerHeight = (
	shape: AutoHeightShape,
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
): number | null => {
	const fitsAt = (height: number): boolean | null => {
		const region = textRegion({ ...shape, height }, "body");
		if (region === null) {
			return null;
		}
		const box = calcTextContentBox(region);
		const lines = layoutVisualLines(text, font, box.width);
		return lines.reduce((total, line) => total + line.height, 0) <= box.height;
	};

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
		if (fitting >= 1_000_000) {
			return null;
		}
		tooShort = fitting;
		fitting = Math.min(fitting * 2, 1_000_000);
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
	return fitting;
};

/** Region insetting each side by a constant fraction of the box, as most shipped types declare theirs. */
const insetRegion =
	(insets: {
		top?: number;
		right?: number;
		bottom?: number;
		left?: number;
	}): ObjectDocTextRegionCalculator =>
	({ width, height }) => {
		const left = width * (insets.left ?? 0);
		const right = width * (insets.right ?? 0);
		const top = height * (insets.top ?? 0);
		const bottom = height * (insets.bottom ?? 0);
		return {
			x: -width / 2 + left,
			y: -height / 2 + top,
			width: width - left - right,
			height: height - top - bottom,
		};
	};

/**
 * One region per shape of region the shipped set declares, named after the types
 * that declare it. The first four keep their width whatever the height does; the
 * rest do not, which is the case a shared layout has to keep answering the same
 * way as a layout per height.
 */
const REGION_FAMILIES: readonly {
	name: string;
	textRegion: ObjectDocTextRegionCalculator;
}[] = [
	{ name: "whole box (rect, sticky, note)", textRegion: calcFullBoxTextRegion },
	{
		name: "constant inset on every side (diamond, ellipse)",
		textRegion: insetRegion({
			top: 0.25,
			right: 0.25,
			bottom: 0.25,
			left: 0.25,
		}),
	},
	{
		name: "constant side caps (hexagon, subroutine, trapezoid)",
		textRegion: insetRegion({ left: 0.125, right: 0.125 }),
	},
	{
		name: "constant top and bottom bands (db, document)",
		textRegion: insetRegion({ top: 0.2, bottom: 0.1 }),
	},
	{
		name: "corner cut off the shorter side (card, loop limit)",
		textRegion: ({ width, height }) => {
			const cut = Math.min(width, height) * 0.2;
			return {
				x: -width / 2,
				y: -height / 2 + cut,
				width,
				height: height - cut,
			};
		},
	},
	{
		name: "sheet offsets off the shorter side (multi document)",
		textRegion: ({ width, height }) => {
			const offset = Math.min(width, height) * 0.08;
			return {
				x: -width / 2,
				y: -height / 2 + offset * 2,
				width: width - offset * 2,
				height: (height - offset * 2) * 0.9,
			};
		},
	},
	{
		name: "cap radius off the height (delay)",
		textRegion: ({ width, height }) => ({
			x: -width / 2,
			y: -height / 2,
			width: Math.max(0, width - height / 2),
			height,
		}),
	},
	{
		name: "caps on the longer axis (stadium)",
		textRegion: ({ width, height }) => {
			const capRadius = Math.min(width, height) / 2;
			return width >= height
				? {
						x: -width / 2 + capRadius,
						y: -height / 2,
						width: width - capRadius * 2,
						height,
					}
				: {
						x: -width / 2,
						y: -height / 2 + capRadius,
						width,
						height: height - capRadius * 2,
					};
		},
	},
	{
		name: "header band of a stated height (container)",
		textRegion: (doc) => ({
			x: -doc.width / 2,
			y: -doc.height / 2,
			width: doc.width,
			height: (doc as { headerHeight?: number }).headerHeight ?? 32,
		}),
	},
	{
		name: "no region at all (actor, cross)",
		textRegion: calcOutsideBoxTextRegion,
	},
];

/** Texts spanning what decides a break: nothing, one word, wrapping, CJK, authored lines, mixed runs. */
const PARITY_TEXTS: readonly { name: string; text: RichText }[] = [
	{ name: "empty", text: "" },
	{ name: "one word", text: "Label" },
	{
		name: "long ascii",
		text: "aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll",
	},
	{ name: "cjk", text: "大量のテキストを読み込ませて折り返しを起こす" },
	{ name: "authored lines", text: "first line\n\nthird line\nfourth" },
	{
		name: "mixed runs",
		text: [
			{ text: "small " },
			{ text: "LARGE ", fontSize: 24 },
			{ text: "another family", fontFamily: "Noto Serif JP" },
		],
	},
];

describe("calcAutoShapeHeight sharing one layout between heights", () => {
	afterEach(() => {
		setTextWidthMeasurerFactory(null);
	});

	it.each(REGION_FAMILIES)(
		"answers what a layout per height answers: $name",
		({ textRegion }) => {
			for (const { name, text } of PARITY_TEXTS) {
				for (const width of [40, 120, 200, 264, 400]) {
					for (const fontSize of [10, 16, 32]) {
						const font = { ...FALLBACK_FONT, fontSize };
						const shape = { width, height: 0, headerHeight: 40 };
						expect(
							calcAutoShapeHeight(shape, text, font, textRegion),
							`${name} at ${width}x?/${fontSize}px`,
						).toBe(calcAutoShapeHeightPerHeight(shape, text, font, textRegion));
					}
				}
			}
		},
	);

	it("lays the text out once where the region keeps its width", () => {
		let layoutPasses = 0;
		// One measurer is built per styled run per layout pass, and this text is
		// one run, so the count is the number of passes.
		setTextWidthMeasurerFactory((font: TextMeasureFont) => {
			layoutPasses += 1;
			return (measured) => measured.length * font.fontSize * 0.6;
		});
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
