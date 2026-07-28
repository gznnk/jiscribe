import { describe, expect, it } from "vitest";

import type { TextMeasureFont } from "../measureText";
import { calcVisualLineCount, measureTextWidth } from "../measureText";

/**
 * These run in the node environment, where there is no `document` and therefore
 * no canvas to measure with: every width comes from the documented fallback
 * (characters × fontSize × 0.6). With fontSize 10 that is exactly 6px per
 * character, which is what the widths below are chosen against — the wrapping
 * algorithm is what is under test, not the measurement.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character takes under the fallback measurement. */
const CHAR_WIDTH = 6;

describe("measureTextWidth", () => {
	it("falls back to a per-character estimate outside a browser", () => {
		expect(typeof document).toBe("undefined");
		expect(measureTextWidth("abc", font)).toBe(3 * CHAR_WIDTH);
	});

	it("an empty string has no width", () => {
		expect(measureTextWidth("", font)).toBe(0);
	});
});

describe("calcVisualLineCount", () => {
	it("an empty string still occupies one line", () => {
		expect(calcVisualLineCount("", font, 100)).toBe(1);
	});

	it("counts authored newlines, empty lines included", () => {
		expect(calcVisualLineCount("a\n\nb", font, 100)).toBe(3);
	});

	it("keeps a line that fits on one line", () => {
		// "aaa bbb" = 7 characters = 42px.
		expect(calcVisualLineCount("aaa bbb", font, 60)).toBe(1);
	});

	it("breaks at the word boundary when the next word does not fit", () => {
		// "aaa " = 24px fits, adding "bbb" (18px) would need 42px.
		expect(calcVisualLineCount("aaa bbb", font, 40)).toBe(2);
	});

	it("counts the extra line a word boundary forces, which a width ratio misses", () => {
		// Three 6-character words in a 10-character box: each line has room for one
		// word only, so the box needs 3 lines where 120px / 60px estimates 2 — the
		// under-count that clipped the connector label.
		const words = "aaaaaa aaaaaa aaaaaa";
		expect(Math.ceil(measureTextWidth(words, font) / 60)).toBe(2);
		expect(calcVisualLineCount(words, font, 60)).toBe(3);
	});

	it("splits a word longer than the line between characters", () => {
		// 10 characters = 60px in a 30px box: 5 characters per line.
		expect(calcVisualLineCount("aaaaaaaaaa", font, 30)).toBe(2);
	});

	it("continues the following word after a word was split", () => {
		// Lines are "aaaaa" and "aaa b": the split word's remainder leaves room.
		expect(calcVisualLineCount("aaaaaaaa b", font, 30)).toBe(2);
	});

	it("trailing spaces hang past the edge instead of wrapping", () => {
		// "aaaaa" is exactly 30px; the trailing space must not add a line.
		expect(calcVisualLineCount("aaaaa ", font, 30)).toBe(1);
	});

	it("breaks CJK between characters, with no space needed", () => {
		// 5 characters, 2 per line.
		expect(calcVisualLineCount("あいうえお", font, 12)).toBe(3);
	});

	it("wraps each authored line on its own", () => {
		expect(calcVisualLineCount("aaa bbb\nccc", font, 40)).toBe(3);
	});

	it("a non-positive width still yields one line per character", () => {
		expect(calcVisualLineCount("ab", font, 0)).toBe(2);
	});
});
