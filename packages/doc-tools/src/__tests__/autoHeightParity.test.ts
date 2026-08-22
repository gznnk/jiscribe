import type { ObjectDocTextRegionCalculator, RichText } from "@jiscribe/doc";
import { supportsAutoHeight } from "@jiscribe/doc";
import type { AutoHeightShape, TextMeasureFont } from "@jiscribe/doc/unstable";
import {
	calcAutoShapeHeight,
	calcTextContentBox,
	DEFAULT_FONT_FAMILY,
	layoutVisualLines,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/doc/unstable";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { installNodeTextMeasurer } from "../measure/nodeTextMeasurer";

/**
 * The search as it was written before the layouts within one call were shared:
 * every height it tries lays the text out again. Kept here as the answer the
 * shipped types are measured against, the sharing being an optimisation that
 * must not move a single height.
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

/** The font a body with no styling of its own is drawn with. */
const bodyFont = (fontSize: number): TextMeasureFont => ({
	fontSize,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle: TEXT_STYLE_FALLBACK.fontStyle,
});

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

/** Every shipped type whose height the text decides: what the parity matrix runs over. */
const autoHeightTypes = [...standardObjectDocDefinitions]
	.filter(
		([, definition]) =>
			supportsAutoHeight(definition) && definition.textRegion !== undefined,
	)
	.map(([type, definition]) => ({ type, definition }));

describe("the derived height of every shipped type that may leave it out", () => {
	it("covers the whole shipped set", () => {
		expect(autoHeightTypes.length).toBeGreaterThan(25);
	});

	it.each(autoHeightTypes)(
		"is the one a layout per height answers: $type",
		({ definition }) => {
			installNodeTextMeasurer();
			for (const { name, text } of PARITY_TEXTS) {
				for (const width of [120, 240]) {
					for (const fontSize of [16, 32]) {
						const shape = { ...definition.defaults, width, height: 0 };
						const font = bodyFont(fontSize);
						expect(
							calcAutoShapeHeight(shape, text, font, definition.textRegion!),
							`${name} at ${width}px/${fontSize}px`,
						).toBe(
							calcAutoShapeHeightPerHeight(
								shape,
								text,
								font,
								definition.textRegion!,
							),
						);
					}
				}
			}
		},
	);
});
