import {
	layoutVisualLines,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";
import { describe, expect, it } from "vitest";

import { nodeTextMeasurement } from "../nodeTextMeasurer";

/** The stack a document that names no family is drawn with (fontFamilies.ts `sans`). */
const SANS_STACK = '"Source Sans 3", "Noto Sans JP", sans-serif';

const measureWidth = (
	text: string,
	fontSize: number,
	fontFamily = SANS_STACK,
	fontWeight = "normal",
): number => {
	offerTextMeasurement(nodeTextMeasurement());
	return layoutVisualLines(text, { fontSize, fontFamily, fontWeight })[0].width;
};

describe("nodeTextMeasurement", () => {
	it("measures Latin text from Source Sans 3 rather than the 0.6em estimate", () => {
		// "Hello" at 16px: 35.2px off the shipped face, where the estimate says 48.
		expect(measureWidth("Hello", 16)).toBeCloseTo(35.2, 1);
	});

	it("measures a Japanese run off the JP face behind the Latin one", () => {
		// The stack's first family covers no kana, so every character falls through
		// to Noto Sans JP: ten near-full-width characters at 13px, which the 0.6em
		// estimate would have put at 78.
		expect(measureWidth("チャットアシスタント", 13)).toBeCloseTo(129.35, 1);
	});

	it("scales linearly with the type size", () => {
		expect(measureWidth("Hello", 32)).toBeCloseTo(
			measureWidth("Hello", 16) * 2,
			3,
		);
	});

	it("measures bold wider than regular", () => {
		expect(measureWidth("Hello", 16, SANS_STACK, "bold")).toBeGreaterThan(
			measureWidth("Hello", 16),
		);
	});

	it("measures a mixed Latin / Japanese line as the sum of both faces", () => {
		// Each stretch is measured under the face that draws it, and the two add up:
		// nothing kerns across the boundary, which is where the runs are split.
		expect(measureWidth("AI エージェント", 14)).toBeCloseTo(
			measureWidth("AI ", 14) + measureWidth("エージェント", 14),
			3,
		);
	});

	it.each([
		// Source Sans 3 draws U+2002 itself, so Noto Sans JP's copy needs a stack
		// that starts there.
		["U+2002", "\u2002", '"Noto Sans JP", sans-serif'],
		["U+2009", "\u2009", SANS_STACK],
		["U+200B", "\u200B", SANS_STACK],
		["U+FEFF", "\uFEFF", SANS_STACK],
	])(
		"measures %s, an empty glyph fontkit cannot read, without throwing",
		(_label, space, fontFamily) => {
			for (const fontWeight of ["normal", "bold"]) {
				const spacedWidth = measureWidth(
					`a${space}b`,
					16,
					fontFamily,
					fontWeight,
				);
				expect(spacedWidth).toBeGreaterThanOrEqual(
					measureWidth("ab", 16, fontFamily, fontWeight),
				);
				expect(spacedWidth).toBeLessThan(
					measureWidth("ab", 16, fontFamily, fontWeight) + 16,
				);
			}
		},
	);

	it("measures a thin space as Source Sans 3's hmtx advance", () => {
		// 100 / 1000 em at 16px.
		expect(measureWidth("a\u2009b", 16)).toBeCloseTo(
			measureWidth("a", 16) + 1.6 + measureWidth("b", 16),
			3,
		);
	});

	it("leaves a family the canvas does not ship to the estimate", () => {
		// 5 characters × 16px × 0.6 — the canvas's own fallback, which the factory
		// defers to by declining the font.
		expect(measureWidth("Hello", 16, "Comic Sans MS, cursive")).toBeCloseTo(
			48,
			3,
		);
	});

	it("wraps where the measured width runs out, not where a character count would", () => {
		// "Hello" is 35.2px wide, so a 80px line holds two and breaks before the third.
		const lines = layoutVisualLines(
			"Hello Hello Hello",
			{ fontSize: 16, fontFamily: SANS_STACK, fontWeight: "normal" },
			80,
		);
		expect(lines).toHaveLength(2);
	});
});
