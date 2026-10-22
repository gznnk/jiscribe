import { describe, expect, it } from "vitest";

import { calcMixedFamilyLineSlack } from "../mixedFamilyLineSlack";
import { TEXT_LINE_HEIGHT } from "../textLineHeight";
import { createOffsetMeasurer, splitAuthoredLines } from "../textOffsets";
import { FALLBACK_CHAR_WIDTH, FALLBACK_FONT } from "./support/fallbackFont";

const BASE_LINE_HEIGHT = FALLBACK_FONT.fontSize * TEXT_LINE_HEIGHT;

describe("splitAuthoredLines", () => {
	it("gives an empty text one empty line", () => {
		expect(splitAuthoredLines("")).toEqual([{ start: 0, end: 0 }]);
	});

	it("leaves the newline out of both lines it separates", () => {
		expect(splitAuthoredLines("ab\ncd")).toEqual([
			{ start: 0, end: 2 },
			{ start: 3, end: 5 },
		]);
	});

	it("opens an empty line after a trailing newline and between two newlines", () => {
		expect(splitAuthoredLines("a\n\n")).toEqual([
			{ start: 0, end: 1 },
			{ start: 2, end: 2 },
			{ start: 3, end: 3 },
		]);
	});
});

describe("createOffsetMeasurer", () => {
	it("flattens the runs into the string its offsets index into", () => {
		const { plain } = createOffsetMeasurer(
			[{ text: "ab" }, { text: "\ncd", fontSize: 20 }],
			FALLBACK_FONT,
		);
		expect(plain).toBe("ab\ncd");
	});

	describe("width", () => {
		it("sums a stretch spanning two runs, each under its own size", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "ab" }, { text: "cd", fontSize: 20 }],
				FALLBACK_FONT,
			);
			// "b" at 10px and "c" at 20px.
			expect(measurer.width(1, 3)).toBe(
				FALLBACK_CHAR_WIDTH + FALLBACK_CHAR_WIDTH * 2,
			);
		});

		it("is zero for an empty stretch", () => {
			const { measurer } = createOffsetMeasurer("abc", FALLBACK_FONT);
			expect(measurer.width(2, 2)).toBe(0);
		});
	});

	describe("lineHeight", () => {
		it("never goes below the slot's own size, however small the runs are", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "ab", fontSize: 4 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 2)).toBe(BASE_LINE_HEIGHT);
		});

		it("takes the tallest run drawn on the line", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a" }, { text: "b", fontSize: 30 }, { text: "\nc" }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 2)).toBe(30 * TEXT_LINE_HEIGHT);
			expect(measurer.lineHeight(3, 4)).toBe(BASE_LINE_HEIGHT);
		});

		it("counts a run opening at the newline that ends the line as drawn on it", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a" }, { text: "\nb", fontSize: 30 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 1)).toBe(30 * TEXT_LINE_HEIGHT);
		});

		it("does not reach past a soft wrap into the next line's run", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a" }, { text: "b", fontSize: 30 }],
				FALLBACK_FONT,
			);
			// [0, 1) ends without a newline, so "b" belongs to the next line alone.
			expect(measurer.lineHeight(0, 1)).toBe(BASE_LINE_HEIGHT);
		});

		it("gives an empty line the size of the run it sits in", () => {
			// Enter pressed at the end of a 40px run.
			const { measurer } = createOffsetMeasurer(
				[{ text: "a\n", fontSize: 40 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(2, 2)).toBe(40 * TEXT_LINE_HEIGHT);
		});

		it("measures an empty first line by the run its newline opens", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "" }, { text: "\na", fontSize: 40 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 0)).toBe(40 * TEXT_LINE_HEIGHT);
		});

		it("leaves an empty text at the slot's size, having no run to inherit", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "", fontSize: 40 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 0)).toBe(BASE_LINE_HEIGHT);
		});

		it("adds the mixed-family slack when a run on the line is in another family", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a" }, { text: "b", fontFamily: "Noto Serif JP" }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 2)).toBe(
				BASE_LINE_HEIGHT + calcMixedFamilyLineSlack(FALLBACK_FONT.fontSize),
			);
		});

		it("takes the slack at the tallest size on the line", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a", fontSize: 40, fontFamily: "Noto Serif JP" }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 1)).toBe(
				40 * TEXT_LINE_HEIGHT + calcMixedFamilyLineSlack(40),
			);
		});

		it("adds no slack when every run is in the slot's family", () => {
			const { measurer } = createOffsetMeasurer(
				[{ text: "a", fontFamily: FALLBACK_FONT.fontFamily, fontSize: 20 }],
				FALLBACK_FONT,
			);
			expect(measurer.lineHeight(0, 1)).toBe(20 * TEXT_LINE_HEIGHT);
		});
	});
});
