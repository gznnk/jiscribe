import { describe, expect, it } from "vitest";

import type { RichText } from "../../../model/objects/types/RichText";
import { calcVisualLineCount } from "../calcVisualLineCount";
import { calcVisualTextHeight } from "../calcVisualTextHeight";
import { layoutVisualLines } from "../layoutVisualLines";
import { TEXT_LINE_HEIGHT } from "../textLineHeight";
import { FALLBACK_FONT } from "./support/fallbackFont";

describe("calcVisualTextHeight", () => {
	it("adds up the line boxes, the taller runs included", () => {
		expect(
			calcVisualTextHeight(
				[{ text: "a\n" }, { text: "b", fontSize: 20 }],
				FALLBACK_FONT,
			),
		).toBe(10 * TEXT_LINE_HEIGHT + 20 * TEXT_LINE_HEIGHT);
	});

	it("matches the line count times the line height when nothing is styled", () => {
		expect(calcVisualTextHeight("a\nb\nc", FALLBACK_FONT, 100)).toBe(
			calcVisualLineCount("a\nb\nc", FALLBACK_FONT, 100) *
				FALLBACK_FONT.fontSize *
				TEXT_LINE_HEIGHT,
		);
	});

	// Without a width the height is taken from the type sizes alone, skipping the
	// layout that measures each line's width. The two paths must not drift apart,
	// so each case is checked against the heights layoutVisualLines reports.
	describe("taken without wrapping", () => {
		const unwrappedCases: [name: string, text: RichText][] = [
			["a plain single line", "abc"],
			["authored newlines", "abc\ndef"],
			["an empty text", ""],
			["an empty line between two others", "a\n\nb"],
			["a trailing newline", "a\n"],
			["nothing but newlines", "\n\n"],
			["a styled run taller than the slot", [{ text: "a\nb", fontSize: 30 }]],
			["a run smaller than the slot", [{ text: "ab", fontSize: 4 }]],
			[
				"runs of mixed sizes, one spanning a newline",
				[
					{ text: "aa" },
					{ text: "bb\ncc", fontSize: 20 },
					{ text: "dd", fontSize: 14 },
				],
			],
			["a zero-length run on its own line", [{ text: "a\n" }, { text: "" }]],
			[
				"a run that only sets the weight",
				[{ text: "a\nb", fontWeight: "bold" }],
			],
		];

		it.each(unwrappedCases)("agrees with the laid-out lines: %s", (_, text) => {
			const laidOut = layoutVisualLines(text, FALLBACK_FONT).reduce(
				(total, line) => total + line.height,
				0,
			);
			expect(calcVisualTextHeight(text, FALLBACK_FONT)).toBe(laidOut);
		});
	});
});
