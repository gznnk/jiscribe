import { describe, expect, it } from "vitest";

import type { TextDoc } from "../../../../../schemas/objects/primitives/text/TextDoc";
import { calcTextObjectFrameSize } from "../calcTextObjectFrameSize";
import { calcTextDrawnTopLeft } from "../textDrawnTopLeft";
import { textToDoc, textToState } from "../TextMapper";
import type { TextState } from "../TextState";

const doc = (overrides: Record<string, unknown> = {}): TextDoc =>
	({
		id: "t1",
		type: "text",
		x: 10,
		y: 20,
		text: "hello",
		textAlign: "left",
		verticalAlign: "top",
		fontColor: "auto",
		fontSize: 16,
		fontFamily: "Noto Sans JP",
		fontWeight: "normal",
		...overrides,
	}) as unknown as TextDoc;

describe("textToState", () => {
	it("measures the box the doc does not store", () => {
		const state = textToState(doc());
		const { width, height } = calcTextObjectFrameSize(
			"hello",
			{ fontSize: 16, fontFamily: "Noto Sans JP", fontWeight: "normal" },
			"Noto Sans JP",
		);

		expect(state.width).toBe(width);
		expect(state.height).toBe(height);
	});

	it("reads (x, y) as the drawn top-left, so the center follows the size", () => {
		const state = textToState(doc());

		expect(state.cx).toBe(10 + state.width / 2);
		expect(state.cy).toBe(20 + state.height / 2);
	});

	it("puts the drawn top-left on (x, y) under rotation and flip", () => {
		const state = textToState(doc({ rotation: 30, flipX: true }));
		const drawnTopLeft = calcTextDrawnTopLeft(state);

		expect(drawnTopLeft.x).toBeCloseTo(10, 9);
		expect(drawnTopLeft.y).toBeCloseTo(20, 9);
	});

	it("expands the flat text group into the one body slot", () => {
		const state = textToState(doc());

		expect(state.text).toEqual({
			body: {
				text: "hello",
				textAlign: "left",
				verticalAlign: "top",
				fontColor: "auto",
				fontSize: 16,
				fontFamily: "Noto Sans JP",
				fontWeight: "normal",
			},
		});
	});

	it("converts the transform group like any other frame shape", () => {
		const state = textToState(doc({ rotation: 45, flipX: true }));

		expect(state.rotation).toBe(45);
		expect(state.scaleX).toBe(-1);
		expect(state.scaleY).toBe(1);
	});

	it("grows the box wider for longer text, keeping the drawn top-left fixed", () => {
		const short = textToState(doc({ text: "a" }));
		const long = textToState(doc({ text: "a much longer body" }));

		expect(long.width).toBeGreaterThan(short.width);
		expect(long.cx - long.width / 2).toBe(short.cx - short.width / 2);
	});
});

describe("textToDoc", () => {
	it("drops the derived size and emits the drawn top-left it was measured around", () => {
		const state = textToState(doc());
		const roundTripped = textToDoc(state) as unknown as Record<string, unknown>;

		expect(roundTripped.x).toBe(10);
		expect(roundTripped.y).toBe(20);
		expect(roundTripped).not.toHaveProperty("width");
		expect(roundTripped).not.toHaveProperty("height");
	});

	it("folds the body slot back flat", () => {
		const state = textToState(doc({ rotation: 30 }));
		const roundTripped = textToDoc(state) as unknown as Record<string, unknown>;

		expect(roundTripped.text).toBe("hello");
		expect(roundTripped.fontSize).toBe(16);
		expect(roundTripped.rotation).toBe(30);
	});

	it("uses the state's own size, not the text's, to recover the drawn top-left", () => {
		// A state whose box was measured elsewhere (with the theme's family) must
		// come back to the corner that box was anchored on.
		const state = {
			...textToState(doc()),
			cx: 100,
			cy: 60,
			width: 40,
			height: 20,
		} as TextState;

		const roundTripped = textToDoc(state) as unknown as Record<string, unknown>;

		expect(roundTripped.x).toBe(80);
		expect(roundTripped.y).toBe(50);
	});

	it("returns the (x, y) it started from under rotation and flip, whatever the box measures", () => {
		const transform = { rotation: 30, flipX: true };
		const short = textToState(doc({ ...transform, text: "a" }));
		const long = textToState(doc({ ...transform, text: "a much longer body" }));
		const shortDoc = textToDoc(short) as unknown as Record<string, unknown>;
		const longDoc = textToDoc(long) as unknown as Record<string, unknown>;

		// The two boxes differ, so a coordinate that survives both is one the size
		// cannot reach — which is the whole point of anchoring on the drawn corner.
		expect(long.width).toBeGreaterThan(short.width);
		expect(long.cx).not.toBeCloseTo(short.cx, 3);
		expect(shortDoc).toMatchObject({ x: 10, y: 20 });
		expect(longDoc).toMatchObject({ x: 10, y: 20 });
	});
});
