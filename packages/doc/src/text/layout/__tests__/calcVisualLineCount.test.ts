import { describe, expect, it } from "vitest";

import { calcVisualLineCount } from "../calcVisualLineCount";
import { measureTextWidth } from "../measureTextWidth";
import { FALLBACK_FONT } from "./support/fallbackFont";

describe("calcVisualLineCount", () => {
	it("an empty string still occupies one line", () => {
		expect(calcVisualLineCount("", FALLBACK_FONT, 100)).toBe(1);
	});

	it("counts authored newlines, empty lines included", () => {
		expect(calcVisualLineCount("a\n\nb", FALLBACK_FONT, 100)).toBe(3);
	});

	it("keeps a line that fits on one line", () => {
		// "aaa bbb" = 7 characters = 42px.
		expect(calcVisualLineCount("aaa bbb", FALLBACK_FONT, 60)).toBe(1);
	});

	it("breaks at the word boundary when the next word does not fit", () => {
		// "aaa " = 24px fits, adding "bbb" (18px) would need 42px.
		expect(calcVisualLineCount("aaa bbb", FALLBACK_FONT, 40)).toBe(2);
	});

	it("counts the extra line a word boundary forces, which a width ratio misses", () => {
		// Three 6-character words in a 10-character box: each line has room for one
		// word only, so the box needs 3 lines where 120px / 60px estimates 2 — the
		// under-count that clipped the connector label.
		const words = "aaaaaa aaaaaa aaaaaa";
		expect(Math.ceil(measureTextWidth(words, FALLBACK_FONT) / 60)).toBe(2);
		expect(calcVisualLineCount(words, FALLBACK_FONT, 60)).toBe(3);
	});

	it("splits a word longer than the line between characters", () => {
		// 10 characters = 60px in a 30px box: 5 characters per line.
		expect(calcVisualLineCount("aaaaaaaaaa", FALLBACK_FONT, 30)).toBe(2);
	});

	it("continues the following word after a word was split", () => {
		// Lines are "aaaaa" and "aaa b": the split word's remainder leaves room.
		expect(calcVisualLineCount("aaaaaaaa b", FALLBACK_FONT, 30)).toBe(2);
	});

	it("trailing spaces hang past the edge instead of wrapping", () => {
		// "aaaaa" is exactly 30px; the trailing space must not add a line.
		expect(calcVisualLineCount("aaaaa ", FALLBACK_FONT, 30)).toBe(1);
	});

	it("breaks CJK between characters, with no space needed", () => {
		// 5 characters, 2 per line.
		expect(calcVisualLineCount("あいうえお", FALLBACK_FONT, 12)).toBe(3);
	});

	it("wraps each authored line on its own", () => {
		expect(calcVisualLineCount("aaa bbb\nccc", FALLBACK_FONT, 40)).toBe(3);
	});

	it("a non-positive width still yields one line per character", () => {
		expect(calcVisualLineCount("ab", FALLBACK_FONT, 0)).toBe(2);
	});
});
