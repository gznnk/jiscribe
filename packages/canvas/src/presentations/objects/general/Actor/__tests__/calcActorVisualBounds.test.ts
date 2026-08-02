import { describe, it, expect } from "vitest";

import { BODY_TEXT_SLOT_ID } from "../../../../../constants/textSlotId";
import type { TextSlot } from "../../../../../schemas/objects/types/TextSlot";
import { expectRectCloseTo } from "../../../__tests__/support/expectRectCloseTo";
import { ACTOR_LABEL_GAP, calcActorTextRegion } from "../calcActorTextRegion";
import { calcActorVisualBounds } from "../calcActorVisualBounds";

const actor = (
	width: number,
	height: number,
	slot?: Partial<TextSlot>,
): { width: number; height: number; text?: Record<string, TextSlot> } => ({
	width,
	height,
	text: slot ? { [BODY_TEXT_SLOT_ID]: { text: "", ...slot } } : undefined,
});

describe("calcActorVisualBounds", () => {
	it("is just the box when there is no label to draw", () => {
		const figureBox = { x: -40, y: -50, width: 80, height: 100 };
		expectRectCloseTo(calcActorVisualBounds(actor(80, 100)), figureBox);
		expectRectCloseTo(
			calcActorVisualBounds(actor(80, 100, { text: "" })),
			figureBox,
		);
	});

	it("extends below the box by the gap plus the label height", () => {
		const state = actor(80, 100, { text: "Customer" });
		const label = calcActorTextRegion(state, BODY_TEXT_SLOT_ID);
		const bounds = calcActorVisualBounds(state);

		expect(bounds.y).toBeCloseTo(-50);
		expect(bounds.y + bounds.height).toBeCloseTo(label.y + label.height);
		expect(bounds.height).toBeCloseTo(100 + ACTOR_LABEL_GAP + label.height);
	});

	it("keeps the box width while the label is narrower", () => {
		const bounds = calcActorVisualBounds(actor(200, 100, { text: "ab" }));
		expect(bounds.x).toBeCloseTo(-100);
		expect(bounds.width).toBeCloseTo(200);
	});

	it("widens past the box when the label is wider than it", () => {
		const state = actor(20, 100, { text: "a long label that overflows" });
		const label = calcActorTextRegion(state, BODY_TEXT_SLOT_ID);
		const bounds = calcActorVisualBounds(state);

		expect(label.width).toBeGreaterThan(20);
		expect(bounds.width).toBeCloseTo(label.width);
		expect(bounds.x + bounds.width / 2).toBeCloseTo(0);
	});

	it("grows further for a label that takes more lines", () => {
		const oneLine = calcActorVisualBounds(actor(80, 100, { text: "one" }));
		const twoLines = calcActorVisualBounds(
			actor(80, 100, { text: "one\ntwo" }),
		);
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});
});
