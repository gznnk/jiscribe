import type { ObjectDocTextRegionCalculator, RichText } from "@jiscribe/doc";
import { supportsAutoHeight } from "@jiscribe/doc";
import type { AutoHeightShape, TextMeasureFont } from "@jiscribe/doc/unstable";
import {
	AUTO_HEIGHT_COMFORT_PADDING_EM,
	calcAutoShapeHeight,
	calcTextContentBox,
	DEFAULT_FONT_FAMILY,
	layoutVisualLines,
	offerTextMeasurement,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/doc/unstable";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { nodeTextMeasurement } from "../measure/nodeTextMeasurer";

/** The font a body with no styling of its own is drawn with. */
const bodyFont = (fontSize: number): TextMeasureFont => ({
	fontSize,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle: TEXT_STYLE_FALLBACK.fontStyle,
});

/** Texts spanning what decides a break: nothing, one word, wrapping, CJK, authored lines, mixed runs. */
const MATRIX_TEXTS: readonly { name: string; text: RichText }[] = [
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

/** Every shipped type whose height the text decides: what the matrix runs over. */
const autoHeightTypes = [...standardObjectDocDefinitions]
	.filter(
		([, definition]) =>
			supportsAutoHeight(definition) && definition.textRegion !== undefined,
	)
	.map(([type, definition]) => ({ type, definition }));

/**
 * How far the exhaustive walk is willing to climb. A cap on the test's own cost
 * rather than on what is checked: a type taking its inset off the height turns a
 * narrow box into a very tall one — a delay 160px wide holds a wrapping
 * paragraph at around 2,300px — and laying the text out at every pixel of that
 * with the shipped fonts would cost more than the rest of the suite. Such a case
 * is still checked for holding its text; the "and nothing shorter would have
 * done" half is left to the cases below the cap, which every type has several
 * of, and to `calcAutoShapeHeight.smallest.test.ts`, which walks the same shapes
 * of region against the fallback measurer where the pixels are cheap.
 */
const EXHAUSTIVE_WALK_CEILING = 400;

/**
 * Whether a box of this height holds the text with the comfort padding around
 * it, worked out from the region and one layout. Deliberately free of the
 * search's own machinery — no bisection, no walk, no rejecting a height against
 * a layout already run — so that agreeing with it says something. The one thing
 * it does borrow is the memo, which is not an assumption but the definition: the
 * text wraps by the width alone.
 */
const createFitTest = (
	text: RichText,
	font: TextMeasureFont,
	textRegion: ObjectDocTextRegionCalculator,
): ((shape: AutoHeightShape, height: number) => boolean) => {
	const textHeightByWidth = new Map<number, number>();
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
		return (
			textHeight + font.fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2 <=
			box.height
		);
	};
};

describe("the derived height of every shipped type that may leave it out", () => {
	it("covers the whole shipped set", () => {
		expect(autoHeightTypes.length).toBeGreaterThan(25);
	});

	it.each(autoHeightTypes)(
		"is the shortest height holding the text, walked one pixel at a time: $type",
		({ definition }) => {
			offerTextMeasurement(nodeTextMeasurement());
			let checkedExhaustively = 0;
			for (const { name, text } of MATRIX_TEXTS) {
				for (const width of [120, 240, 400]) {
					for (const fontSize of [16]) {
						const shape = { ...definition.defaults, width, height: 0 };
						const font = bodyFont(fontSize);
						const where = `${name} at ${width}px/${fontSize}px`;
						const holdsTextAt = createFitTest(
							text,
							font,
							definition.textRegion!,
						);
						const height = calcAutoShapeHeight(
							shape,
							text,
							font,
							definition.textRegion!,
						);
						if (height === null) {
							continue;
						}
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
			// Guards the matrix itself: a cap put too low would leave the walk
			// checking nothing and the test still passing.
			expect(checkedExhaustively).toBeGreaterThan(0);
		},
	);
});
