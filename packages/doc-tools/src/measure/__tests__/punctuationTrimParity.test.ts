import {
	layoutVisualLines,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";
import { describe, expect, it } from "vitest";

import { nodeTextMeasurement } from "../nodeTextMeasurer";
import { calcPunctuationTrimEm } from "../punctuationTrim";
import fixture from "./fixtures/chromiumTextWidths.json" with { type: "json" };

/**
 * How far a measurement of a punctuation pair or chain may sit from what Chromium
 * reported. A twentieth of a pixel is fontkit and HarfBuzz rounding the same
 * advances differently; anything a rule gets wrong lands half an em out, which is
 * three orders of magnitude larger.
 */
const PUNCTUATION_TOLERANCE_PX = 0.05;

/**
 * The same for a whole sentence, which is looser for a reason unrelated to the
 * trimming: the JP faces carry GPOS `kern` pairs between kana (`アシ` is 0.04em
 * narrower kerned), fontkit applies them and Chromium's `measureText` does not —
 * `font-kerning: auto` leaves them off there while the DOM applies them. That
 * costs up to 1.3px on a 780px line of prose and is a separate gap in the Node
 * measurer, not something the trim rule can close.
 */
const SENTENCE_TOLERANCE_PX = 1.5;

const toleranceFor = (group: string): number =>
	group === "sentence" ? SENTENCE_TOLERANCE_PX : PUNCTUATION_TOLERANCE_PX;

const measureWidth = (
	text: string,
	fontSize: number,
	fontWeight: string,
): number =>
	layoutVisualLines(text, {
		fontSize,
		fontFamily: fixture.fontFamily,
		fontWeight,
	})[0].width;

describe("text-spacing-trim parity with Chromium", () => {
	offerTextMeasurement(nodeTextMeasurement());

	it.each(fixture.cases)(
		"measures $group $text at $fontSize px $fontWeight as Chromium does",
		({ group, text, fontSize, fontWeight, width }) => {
			expect(
				Math.abs(measureWidth(text, fontSize, fontWeight) - width),
			).toBeLessThanOrEqual(toleranceFor(group));
		},
	);

	it("keeps every pair and chain within a twentieth of a pixel", () => {
		const worst = fixture.cases
			.filter((testCase) => testCase.group !== "sentence")
			.reduce(
				(largest, testCase) =>
					Math.max(
						largest,
						Math.abs(
							measureWidth(
								testCase.text,
								testCase.fontSize,
								testCase.fontWeight,
							) - testCase.width,
						),
					),
				0,
			);
		expect(worst).toBeLessThanOrEqual(PUNCTUATION_TOLERANCE_PX);
	});
});

describe("calcPunctuationTrimEm", () => {
	it("collapses one half em between two adjacent fullwidth punctuation marks", () => {
		expect(calcPunctuationTrimEm("」「")).toBe(0.5);
		expect(calcPunctuationTrimEm("、「")).toBe(0.5);
		expect(calcPunctuationTrimEm("。」")).toBe(0.5);
	});

	it("charges a boundary once even where both marks offer a half", () => {
		// `」` would give up its end half and `「` its start half; the two overlap.
		expect(calcPunctuationTrimEm("」「")).toBe(0.5);
	});

	it("leaves punctuation next to an ideograph at full width", () => {
		expect(calcPunctuationTrimEm("あ「")).toBe(0);
		expect(calcPunctuationTrimEm("」あ")).toBe(0);
		expect(calcPunctuationTrimEm("「あ」")).toBe(0);
	});

	it("leaves the exclamation and question marks untrimmed", () => {
		expect(calcPunctuationTrimEm("！「")).toBe(0);
		expect(calcPunctuationTrimEm("」！")).toBe(0);
		expect(calcPunctuationTrimEm("？「")).toBe(0);
	});

	it("leaves the fullwidth colon and semicolon untrimmed", () => {
		expect(calcPunctuationTrimEm("」：")).toBe(0);
		expect(calcPunctuationTrimEm("：「")).toBe(0);
		expect(calcPunctuationTrimEm("」；")).toBe(0);
	});

	it("trims the middle dot and the ideographic space only against a half", () => {
		// Neither carries a half of its own, so `・・` and `・あ` keep full width.
		expect(calcPunctuationTrimEm("」・")).toBe(0.5);
		expect(calcPunctuationTrimEm("・「")).toBe(0.5);
		expect(calcPunctuationTrimEm("・・")).toBe(0);
		expect(calcPunctuationTrimEm("・あ")).toBe(0);
	});

	it("decides each boundary of a chain on its own", () => {
		expect(calcPunctuationTrimEm("）」「")).toBe(1);
		expect(calcPunctuationTrimEm("「「あ")).toBe(0.5);
		expect(calcPunctuationTrimEm("あ」」")).toBe(0.5);
	});

	it("leaves the first and last mark of the text full width", () => {
		expect(calcPunctuationTrimEm("「")).toBe(0);
		expect(calcPunctuationTrimEm("「あ")).toBe(0);
		expect(calcPunctuationTrimEm("あ」")).toBe(0);
	});
});
