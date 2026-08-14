import { describe, expect, it } from "vitest";

import {
	isRichText,
	isSameRichText,
	isTextRun,
	normalizeRichText,
	readRichTextRangeStyle,
	remapRichText,
	richTextLength,
	richTextToPlain,
	sliceRichText,
	styleRichTextRange,
} from "../RichText";

describe("isTextRun", () => {
	it("accepts a run with or without styling", () => {
		expect(isTextRun({ text: "" })).toBe(true);
		expect(isTextRun({ text: "hello", fontWeight: "bold" })).toBe(true);
		expect(
			isTextRun({
				text: "hello",
				fontColor: "auto",
				fontSize: 14,
				fontFamily: "serif",
				fontWeight: "bold",
				fontStyle: "italic",
				textDecoration: "underline",
			}),
		).toBe(true);
	});

	it("rejects a bare string, a missing text, and a mistyped style", () => {
		expect(isTextRun("hello")).toBe(false);
		expect(isTextRun({})).toBe(false);
		expect(isTextRun({ text: 1 })).toBe(false);
		expect(isTextRun({ text: "x", fontSize: "14" })).toBe(false);
		expect(isTextRun({ text: "x", fontWeight: 700 })).toBe(false);
	});
});

describe("isRichText", () => {
	it("accepts both forms of one body of text", () => {
		expect(isRichText("hello")).toBe(true);
		expect(isRichText("")).toBe(true);
		expect(isRichText([])).toBe(true);
		expect(
			isRichText([{ text: "a" }, { text: "b", fontStyle: "italic" }]),
		).toBe(true);
	});

	it("rejects rows, which are a different content kind", () => {
		expect(isRichText(["id", "name"])).toBe(false);
		expect(isRichText(undefined)).toBe(false);
		expect(isRichText({ text: "a" })).toBe(false);
	});
});

describe("richTextToPlain / richTextLength", () => {
	it("reads the characters of either form", () => {
		expect(richTextToPlain("hello")).toBe("hello");
		expect(richTextToPlain([{ text: "he" }, { text: "llo" }])).toBe("hello");
		expect(richTextLength("hello")).toBe(5);
		expect(richTextLength([{ text: "he" }, { text: "llo" }])).toBe(5);
		expect(richTextLength([])).toBe(0);
	});
});

describe("normalizeRichText", () => {
	it("collapses to the plain string when nothing is styled", () => {
		expect(normalizeRichText([{ text: "hello" }])).toBe("hello");
		expect(normalizeRichText([{ text: "he" }, { text: "llo" }])).toBe("hello");
		expect(normalizeRichText([])).toBe("");
		expect(normalizeRichText([{ text: "" }])).toBe("");
	});

	it("merges adjacent runs drawn alike and drops empty ones", () => {
		expect(
			normalizeRichText([
				{ text: "he", fontWeight: "bold" },
				{ text: "", fontWeight: "bold" },
				{ text: "llo", fontWeight: "bold" },
			]),
		).toEqual([{ text: "hello", fontWeight: "bold" }]);
	});

	it("keeps runs that differ, and drops undefined-valued style keys", () => {
		expect(
			normalizeRichText([
				{ text: "a", fontWeight: "bold" },
				{ text: "b", fontWeight: undefined },
			]),
		).toEqual([{ text: "a", fontWeight: "bold" }, { text: "b" }]);
	});

	it("leaves a plain string alone", () => {
		expect(normalizeRichText("hello")).toBe("hello");
	});
});

describe("isSameRichText", () => {
	it("compares the canonical forms, so the two forms of one text match", () => {
		expect(isSameRichText("hello", [{ text: "hello" }])).toBe(true);
		expect(isSameRichText([{ text: "he" }, { text: "llo" }], "hello")).toBe(
			true,
		);
		expect(isSameRichText("", [])).toBe(true);
	});

	it("tells texts apart by their characters", () => {
		expect(isSameRichText("hello", "hell")).toBe(false);
		expect(
			isSameRichText(
				[{ text: "a", fontWeight: "bold" }, { text: "b" }],
				[{ text: "a", fontWeight: "bold" }, { text: "c" }],
			),
		).toBe(false);
	});

	it("tells texts apart by the styling of their runs", () => {
		expect(
			isSameRichText([{ text: "hello", fontWeight: "bold" }], "hello"),
		).toBe(false);
		expect(
			isSameRichText(
				[{ text: "ab", fontWeight: "bold" }],
				[{ text: "ab", fontStyle: "italic" }],
			),
		).toBe(false);
		// Same characters, cut at a different place: one run is drawn bold and the
		// other is not, so the two bodies are not drawn alike.
		expect(
			isSameRichText(
				[{ text: "ab", fontWeight: "bold" }, { text: "cd" }],
				[{ text: "a", fontWeight: "bold" }, { text: "bcd" }],
			),
		).toBe(false);
	});
});

describe("sliceRichText", () => {
	const styled = [
		{ text: "abc" },
		{ text: "def", fontWeight: "bold" },
		{ text: "ghi" },
	];

	it("cuts across runs, keeping each piece's styling", () => {
		expect(sliceRichText(styled, 2, 7)).toEqual([
			{ text: "c" },
			{ text: "def", fontWeight: "bold" },
			{ text: "g" },
		]);
	});

	it("collapses to a plain string when the cut carries no styling", () => {
		expect(sliceRichText(styled, 0, 3)).toBe("abc");
		expect(sliceRichText("hello", 1, 3)).toBe("el");
	});

	it("clamps to the text and yields nothing for an empty range", () => {
		expect(sliceRichText(styled, -5, 100)).toEqual(styled);
		expect(sliceRichText(styled, 4, 4)).toBe("");
		expect(sliceRichText(styled, 7, 2)).toBe("");
	});
});

describe("styleRichTextRange", () => {
	it("styles only the covered characters", () => {
		expect(styleRichTextRange("hello", 0, 2, { fontWeight: "bold" })).toEqual([
			{ text: "he", fontWeight: "bold" },
			{ text: "llo" },
		]);
	});

	it("overrides only the requested fields of a run it covers", () => {
		expect(
			styleRichTextRange([{ text: "hello", fontWeight: "bold" }], 0, 2, {
				fontColor: "#d33",
			}),
		).toEqual([
			{ text: "he", fontWeight: "bold", fontColor: "#d33" },
			{ text: "llo", fontWeight: "bold" },
		]);
	});

	it("merges back into a plain string when a style is applied over the whole text", () => {
		const bold = styleRichTextRange("hello", 0, 2, { fontWeight: "bold" });
		expect(styleRichTextRange(bold, 0, 5, { fontWeight: "normal" })).toEqual([
			{ text: "hello", fontWeight: "normal" },
		]);
	});

	it("styles nothing for an empty or inverted range", () => {
		expect(styleRichTextRange("hello", 2, 2, { fontWeight: "bold" })).toBe(
			"hello",
		);
		expect(styleRichTextRange("hello", 4, 1, { fontWeight: "bold" })).toBe(
			"hello",
		);
	});

	it("never cuts a surrogate pair in half", () => {
		// "😀" is two code units, so offset 1 lands inside it.
		expect(styleRichTextRange("a😀b", 1, 2, { fontWeight: "bold" })).toEqual([
			{ text: "a" },
			{ text: "😀", fontWeight: "bold" },
			{ text: "b" },
		]);
	});
});

describe("readRichTextRangeStyle", () => {
	const styled = [{ text: "abc", fontWeight: "bold" }, { text: "def" }];

	it("reads a value the whole range shares", () => {
		expect(readRichTextRangeStyle(styled, 0, 3, {})).toEqual({
			fontWeight: "bold",
		});
	});

	it("reads nothing for a field the range mixes", () => {
		expect(readRichTextRangeStyle(styled, 0, 6, {})).toEqual({});
	});

	it("falls back to the slot's own styling for what a run does not set", () => {
		expect(readRichTextRangeStyle(styled, 3, 6, { fontSize: 20 })).toEqual({
			fontSize: 20,
		});
		// The run's "bold" and the slot's "bold" are the same value, so the range is
		// uniform even though only one of them carries it.
		expect(
			readRichTextRangeStyle(styled, 0, 6, { fontWeight: "bold" }),
		).toEqual({ fontWeight: "bold" });
	});

	it("reads the slot's own styling for an unstyled text or an empty range", () => {
		expect(readRichTextRangeStyle("hello", 0, 5, { fontSize: 12 })).toEqual({
			fontSize: 12,
		});
		expect(readRichTextRangeStyle(styled, 2, 2, { fontSize: 12 })).toEqual({
			fontSize: 12,
		});
	});
});

describe("remapRichText", () => {
	const styled = [
		{ text: "abc" },
		{ text: "def", fontWeight: "bold" },
		{ text: "ghi" },
	];

	it("passes an unstyled text through as it is", () => {
		expect(remapRichText("hello", "hell")).toBe("hell");
	});

	it("keeps the styling when the text did not change", () => {
		expect(remapRichText(styled, "abcdefghi")).toEqual(styled);
	});

	it("keeps the styling of the characters an insertion left alone", () => {
		expect(remapRichText(styled, "abcXdefghi")).toEqual([
			{ text: "abcX" },
			{ text: "def", fontWeight: "bold" },
			{ text: "ghi" },
		]);
	});

	it("continues the run text is typed into", () => {
		expect(remapRichText(styled, "abcdefXghi")).toEqual([
			{ text: "abc" },
			{ text: "defX", fontWeight: "bold" },
			{ text: "ghi" },
		]);
	});

	it("takes the following run's styling at the very start of the text", () => {
		expect(
			remapRichText([{ text: "def", fontWeight: "bold" }], "Xdef"),
		).toEqual([{ text: "Xdef", fontWeight: "bold" }]);
	});

	it("keeps the styling around a deletion", () => {
		expect(remapRichText(styled, "abcdfghi")).toEqual([
			{ text: "abc" },
			{ text: "df", fontWeight: "bold" },
			{ text: "ghi" },
		]);
	});

	it("collapses to a plain string once the styled characters are gone", () => {
		expect(remapRichText(styled, "abcghi")).toBe("abcghi");
		expect(remapRichText(styled, "")).toBe("");
	});
});
