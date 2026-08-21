import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcTextObjectFrameSize } from "../calcTextObjectFrameSize";
import { resizeTextStateToContent } from "../resizeTextStateToContent";
import { textToDoc, textToState } from "../TextMapper";
import type { TextState } from "../TextState";

const stateOf = (text: string, overrides: Record<string, unknown> = {}) => {
	const { width, height } = calcTextObjectFrameSize(text, { fontSize: 16 });
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
 * The box's axis-aligned top-left, rounded the way resizeTextStateToContent
 * rounds its anchor — a bare `cx - width / 2` carries float noise the box itself
 * does not. It coincides with the corner the doc stores only while the object is
 * neither rotated nor flipped.
 */
const axisAlignedTopLeftOf = (state: TextState) => ({
	x: roundToDecimal(state.cx - state.width / 2, PRECISION.COORDINATE),
	y: roundToDecimal(state.cy - state.height / 2, PRECISION.COORDINATE),
});

/** Where the box's own top-left corner is drawn, rotation and flips applied. */
const drawnTopLeftOf = (state: TextState) =>
	calcAffineTransformedPoint(
		-state.width / 2,
		-state.height / 2,
		state.scaleX ?? 1,
		state.scaleY ?? 1,
		degreesToRadians(state.rotation ?? 0),
		state.cx,
		state.cy,
	);

/**
 * The same text under a transform, typed one word longer. The family is pinned
 * in the slot so a measurement taken elsewhere (the doc mapper's) matches.
 */
const typedLonger = (transform: Record<string, unknown>) => {
	const state = stateOf("hello", transform);
	const typed = {
		...state,
		text: { body: { text: "hello world", fontSize: 16 } },
	} as TextState;
	return { state, resized: resizeTextStateToContent(typed) };
};

describe("resizeTextStateToContent", () => {
	it("returns the same reference when the box already matches the text", () => {
		const state = stateOf("hello");
		expect(resizeTextStateToContent(state)).toBe(state);
	});

	it("keeps the top-left where it was when the text grows", () => {
		const state = stateOf("hello");
		const typed = {
			...state,
			text: { body: { text: "hello world", fontSize: 16 } },
		} as TextState;

		const resized = resizeTextStateToContent(typed);

		expect(resized.width).toBeGreaterThan(state.width);
		expect(axisAlignedTopLeftOf(resized)).toEqual(ANCHOR);
	});

	it("keeps the top-left where it was when the text shrinks", () => {
		const state = stateOf("hello world");
		const typed = {
			...state,
			text: { body: { text: "h", fontSize: 16 } },
		} as TextState;

		const resized = resizeTextStateToContent(typed);

		expect(resized.width).toBeLessThan(state.width);
		expect(axisAlignedTopLeftOf(resized)).toEqual(ANCHOR);
	});

	it("grows the height by a line for each authored newline", () => {
		const oneLine = stateOf("a");
		const twoLines = resizeTextStateToContent({
			...oneLine,
			text: { body: { text: "a\nb", fontSize: 16 } },
		} as TextState);

		expect(twoLines.height).toBeGreaterThan(oneLine.height);
		expect(axisAlignedTopLeftOf(twoLines).y).toBe(ANCHOR.y);
	});

	it("keeps the drawn top-left where it was when a rotated text grows", () => {
		const { state, resized } = typedLonger({ rotation: 90 });
		const before = drawnTopLeftOf(state);
		const after = drawnTopLeftOf(resized);

		expect(resized.width).toBeGreaterThan(state.width);
		// A quarter turn sends the growth straight down, so the axis-aligned
		// `cx - width / 2` corner has to move for the drawn one to stay put.
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
		expect(axisAlignedTopLeftOf(resized)).not.toEqual(
			axisAlignedTopLeftOf(state),
		);
	});

	it("keeps the drawn top-left where it was when a flipped text grows", () => {
		const { state, resized } = typedLonger({ scaleX: -1 });
		const before = drawnTopLeftOf(state);
		const after = drawnTopLeftOf(resized);

		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("survives the doc round trip after a rotated resize", () => {
		const { resized } = typedLonger({ rotation: 37 });
		// The doc stores the very corner this resize anchored on, so the mapper has
		// to land back on the same box from the coordinate it left behind.
		const roundTripped = textToState(textToDoc(resized));

		expect(roundTripped.cx).toBeCloseTo(resized.cx, 3);
		expect(roundTripped.cy).toBeCloseTo(resized.cy, 3);
		expect(roundTripped.width).toBe(resized.width);
		expect(roundTripped.height).toBe(resized.height);
	});

	it("sizes an object with no slot at all to the empty box", () => {
		const state = stateOf("hello");
		const empty = { ...state, text: undefined } as TextState;
		const resized = resizeTextStateToContent(empty);

		expect(resized).toEqual({
			...empty,
			...calcTextObjectFrameSize("", {}),
			cx: ANCHOR.x + resized.width / 2,
			cy: ANCHOR.y + resized.height / 2,
		});
	});
});
