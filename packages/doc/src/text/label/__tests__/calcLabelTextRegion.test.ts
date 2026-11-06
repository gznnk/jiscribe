import { describe, expect, it } from "vitest";

import type { TextSlot } from "../../../model/objects/types/text/TextSlot";
import { TEXT_BLOCK_MIN_WIDTH } from "../../block/calcTextBlockSize";
import { TEXT_BLOCK_WIDTH_SLACK } from "../../block/textBlockWidthSlack";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../block/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "../../layout/textLineHeight";
import { calcLabelTextBoxSize } from "../calcLabelTextBoxSize";
import {
	calcLabelTextRegion,
	calcLabelTextVisualBounds,
	LABEL_TEXT_GAP,
} from "../calcLabelTextRegion";

/**
 * Widths come from the estimate the suite measures with (characters × fontSize ×
 * 0.6, vitest.setup.ts): proportional rather than faithful, but exact, which is
 * what lets the sizes below be pinned rather than compared.
 */
const CHAR_WIDTH_RATIO = 0.6;

/** The box the longest line of `charCount` characters takes at `fontSize`. */
const expectedWidth = (charCount: number, fontSize: number): number =>
	Math.max(
		TEXT_BLOCK_MIN_WIDTH,
		charCount * fontSize * CHAR_WIDTH_RATIO +
			TEXT_BOX_PADDING_X * 2 +
			TEXT_BLOCK_WIDTH_SLACK,
	);

/** The box `lineCount` lines take at `fontSize`; an empty text is still one line. */
const expectedHeight = (lineCount: number, fontSize: number): number =>
	lineCount * fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

const box = { width: 80, height: 100 };

const body = (slot: Partial<TextSlot>): Partial<TextSlot> => slot;

describe("calcLabelTextRegion", () => {
	it("hangs the caption the gap below the box, centred on the origin, sized from its text", () => {
		const width = expectedWidth("Customer".length, 16);
		expect(
			calcLabelTextRegion(box, body({ text: "Customer" }), undefined),
		).toEqual({
			x: -width / 2,
			y: 50 + LABEL_TEXT_GAP,
			width,
			height: expectedHeight(1, 16),
		});
	});

	it("keeps the caption's size whatever the box's", () => {
		const small = calcLabelTextRegion(
			{ width: 20, height: 25 },
			body({ text: "Customer" }),
			undefined,
		);
		const large = calcLabelTextRegion(
			{ width: 400, height: 500 },
			body({ text: "Customer" }),
			undefined,
		);
		expect(small.width).toBe(large.width);
		expect(small.height).toBe(large.height);
		expect(large.y).toBe(250 + LABEL_TEXT_GAP);
	});

	it("sizes an absent body as one empty line at the minimum width", () => {
		expect(calcLabelTextRegion(box, undefined, undefined)).toEqual({
			x: -TEXT_BLOCK_MIN_WIDTH / 2,
			y: 50 + LABEL_TEXT_GAP,
			width: TEXT_BLOCK_MIN_WIDTH,
			height: expectedHeight(1, 16),
		});
		expect(calcLabelTextRegion(box, body({ text: "" }), undefined)).toEqual(
			calcLabelTextRegion(box, undefined, undefined),
		);
	});

	it("widens to the longest line and adds a line per authored newline, with no maximum", () => {
		expect(
			calcLabelTextBoxSize(body({ text: "one\nthree" }), undefined),
		).toEqual({
			width: expectedWidth("three".length, 16),
			height: expectedHeight(2, 16),
		});
		expect(
			calcLabelTextBoxSize(body({ text: "a".repeat(500) }), undefined),
		).toEqual({ width: expectedWidth(500, 16), height: expectedHeight(1, 16) });
	});

	it("reads rows the way they are drawn, joined at newlines", () => {
		expect(
			calcLabelTextBoxSize(body({ text: ["one", "three"] }), undefined),
		).toEqual(calcLabelTextBoxSize(body({ text: "one\nthree" }), undefined));
	});

	it("sizes the box from the styling of each run, not from the body's alone", () => {
		const uniform = calcLabelTextBoxSize(body({ text: "abcdef" }), undefined);
		const partlyLarger = calcLabelTextBoxSize(
			body({ text: [{ text: "abc" }, { text: "def", fontSize: 40 }] }),
			undefined,
		);
		expect(partlyLarger.width).toBeGreaterThan(uniform.width);
		expect(partlyLarger.height).toBeGreaterThan(uniform.height);
	});

	it("measures with the type's own defaults where the body sets none", () => {
		expect(
			calcLabelTextBoxSize(body({ text: "Alpha" }), { fontSize: 24 }),
		).toEqual({
			width: expectedWidth("Alpha".length, 24),
			height: expectedHeight(1, 24),
		});
	});

	it("lets the body's own field win over the type's default", () => {
		expect(
			calcLabelTextBoxSize(body({ text: "Alpha", fontSize: 10 }), {
				fontSize: 24,
			}),
		).toEqual({
			width: expectedWidth("Alpha".length, 10),
			height: expectedHeight(1, 10),
		});
	});

	it("stays a valid box under a zero-sized shape", () => {
		const region = calcLabelTextRegion(
			{ width: 0, height: 0 },
			body({ text: "Customer" }),
			undefined,
		);
		expect(region.y).toBe(LABEL_TEXT_GAP);
		expect(region.width).toBeGreaterThan(0);
		expect(region.height).toBeGreaterThan(0);
	});
});

describe("calcLabelTextVisualBounds", () => {
	const figure = { x: -40, y: -50, width: 80, height: 100 };

	it("is the box alone while there is no caption to draw", () => {
		expect(calcLabelTextVisualBounds(box, undefined, undefined)).toEqual(
			figure,
		);
		expect(
			calcLabelTextVisualBounds(box, body({ text: "" }), undefined),
		).toEqual(figure);
		expect(
			calcLabelTextVisualBounds(box, body({ text: [] }), undefined),
		).toEqual(figure);
	});

	it("reaches down past the gap to the caption's foot, keeping the box's width while the caption is narrower", () => {
		const captioned = body({ text: "ab" });
		const label = calcLabelTextRegion(box, captioned, undefined);
		expect(calcLabelTextVisualBounds(box, captioned, undefined)).toEqual({
			x: -40,
			y: -50,
			width: 80,
			height: 100 + LABEL_TEXT_GAP + label.height,
		});
	});

	it("widens past the box, centred on it, when the caption is wider", () => {
		const captioned = body({ text: "a long label that overflows" });
		const label = calcLabelTextRegion(
			{ width: 20, height: 100 },
			captioned,
			undefined,
		);
		const bounds = calcLabelTextVisualBounds(
			{ width: 20, height: 100 },
			captioned,
			undefined,
		);
		expect(bounds.x).toBe(label.x);
		expect(bounds.width).toBe(label.width);
	});

	it("follows the type's defaults the way the region does", () => {
		const captioned = body({ text: "ab" });
		const label = calcLabelTextRegion(box, captioned, { fontSize: 40 });
		expect(
			calcLabelTextVisualBounds(box, captioned, { fontSize: 40 }).height,
		).toBe(100 + LABEL_TEXT_GAP + label.height);
	});
});
