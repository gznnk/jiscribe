import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { describe, it, expect } from "vitest";

import {
	BELOW_LABEL_GAP,
	calcBelowLabelTextRegion,
} from "../calcBelowLabelTextRegion";
import { calcBelowLabelVisualBounds } from "../calcBelowLabelVisualBounds";
import { expectRectCloseTo } from "./support/expectRectCloseTo";

const shape = (
	width: number,
	height: number,
	slot?: Partial<TextSlot>,
): { width: number; height: number; text?: Record<string, TextSlot> } => ({
	width,
	height,
	text: slot ? { [BODY_TEXT_SLOT_ID]: { text: "", ...slot } } : undefined,
});

describe("calcBelowLabelVisualBounds", () => {
	it("is just the box when there is no label to draw", () => {
		const figureBox = { x: -40, y: -50, width: 80, height: 100 };
		expectRectCloseTo(calcBelowLabelVisualBounds(shape(80, 100)), figureBox);
		expectRectCloseTo(
			calcBelowLabelVisualBounds(shape(80, 100, { text: "" })),
			figureBox,
		);
	});

	it("extends below the box by the gap plus the label height", () => {
		const state = shape(80, 100, { text: "Customer" });
		const label = calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
		const bounds = calcBelowLabelVisualBounds(state);

		expect(bounds.y).toBeCloseTo(-50);
		expect(bounds.y + bounds.height).toBeCloseTo(label.y + label.height);
		expect(bounds.height).toBeCloseTo(100 + BELOW_LABEL_GAP + label.height);
	});

	it("keeps the box width while the label is narrower", () => {
		const bounds = calcBelowLabelVisualBounds(shape(200, 100, { text: "ab" }));
		expect(bounds.x).toBeCloseTo(-100);
		expect(bounds.width).toBeCloseTo(200);
	});

	it("widens past the box when the label is wider than it", () => {
		const state = shape(20, 100, { text: "a long label that overflows" });
		const label = calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
		const bounds = calcBelowLabelVisualBounds(state);

		expect(label.width).toBeGreaterThan(20);
		expect(bounds.width).toBeCloseTo(label.width);
		expect(bounds.x + bounds.width / 2).toBeCloseTo(0);
	});

	it("grows further for a label that takes more lines", () => {
		const oneLine = calcBelowLabelVisualBounds(shape(80, 100, { text: "one" }));
		const twoLines = calcBelowLabelVisualBounds(
			shape(80, 100, { text: "one\ntwo" }),
		);
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});
});
