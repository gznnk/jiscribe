import { roundToDecimal } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { PRECISION } from "../../../../../constants/precision";
import { calcTextObjectFrameSize } from "../../../../../schemas/objects/primitives/text/calcTextObjectFrameSize";
import { resizeTextStateToContent } from "../resizeTextStateToContent";
import type { TextState } from "../TextState";

const FONT_FAMILY = "Noto Sans JP";

const stateOf = (text: string, overrides: Record<string, unknown> = {}) => {
	const { width, height } = calcTextObjectFrameSize(
		text,
		{ fontSize: 16 },
		FONT_FAMILY,
	);
	return {
		id: "t1",
		type: "text",
		cx: 100 + width / 2,
		cy: 60 + height / 2,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: { text, fontSize: 16 } },
		...overrides,
	} as unknown as TextState;
};

/** The corner every `stateOf` box is anchored on. */
const ANCHOR = { x: 100, y: 60 };

/**
 * The corner the doc would store, rounded the way resizeTextStateToContent
 * rounds it — a bare `cx - width / 2` carries float noise the box itself does not.
 */
const topLeftOf = (state: TextState) => ({
	x: roundToDecimal(state.cx - state.width / 2, PRECISION.COORDINATE),
	y: roundToDecimal(state.cy - state.height / 2, PRECISION.COORDINATE),
});

describe("resizeTextStateToContent", () => {
	it("returns the same reference when the box already matches the text", () => {
		const state = stateOf("hello");
		expect(resizeTextStateToContent(state, FONT_FAMILY)).toBe(state);
	});

	it("keeps the top-left where it was when the text grows", () => {
		const state = stateOf("hello");
		const typed = {
			...state,
			text: { body: { text: "hello world", fontSize: 16 } },
		} as TextState;

		const resized = resizeTextStateToContent(typed, FONT_FAMILY);

		expect(resized.width).toBeGreaterThan(state.width);
		expect(topLeftOf(resized)).toEqual(ANCHOR);
	});

	it("keeps the top-left where it was when the text shrinks", () => {
		const state = stateOf("hello world");
		const typed = {
			...state,
			text: { body: { text: "h", fontSize: 16 } },
		} as TextState;

		const resized = resizeTextStateToContent(typed, FONT_FAMILY);

		expect(resized.width).toBeLessThan(state.width);
		expect(topLeftOf(resized)).toEqual(ANCHOR);
	});

	it("grows the height by a line for each authored newline", () => {
		const oneLine = stateOf("a");
		const twoLines = resizeTextStateToContent(
			{
				...oneLine,
				text: { body: { text: "a\nb", fontSize: 16 } },
			} as TextState,
			FONT_FAMILY,
		);

		expect(twoLines.height).toBeGreaterThan(oneLine.height);
		expect(topLeftOf(twoLines).y).toBe(ANCHOR.y);
	});

	it("measures with the object's own family, falling back to the given one", () => {
		const state = stateOf("hello");
		// A family the object names itself pins the measurement, so the fallback
		// cannot move it.
		const styled = {
			...state,
			text: { body: { text: "hello", fontSize: 16, fontFamily: FONT_FAMILY } },
		} as TextState;

		expect(resizeTextStateToContent(styled, "Some Other Family")).toEqual(
			resizeTextStateToContent(styled, FONT_FAMILY),
		);
	});

	it("sizes an object with no slot at all to the empty box", () => {
		const state = stateOf("hello");
		const empty = { ...state, text: undefined } as TextState;
		const resized = resizeTextStateToContent(empty, FONT_FAMILY);

		expect(resized).toEqual({
			...empty,
			...calcTextObjectFrameSize("", {}, FONT_FAMILY),
			cx: ANCHOR.x + resized.width / 2,
			cy: ANCHOR.y + resized.height / 2,
		});
	});
});
