import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

describe("canvasReducer / CLOSE_OTHER_SHAPES_POPOVER", () => {
	it("closes the popover and leaves the selection as it is", () => {
		const state = createTestState(twoRectsDoc, {
			isOtherShapesPopoverOpen: true,
			selection: { objectIds: ["rect-1"], part: null },
		});

		const next = canvasReducer(state, { type: "CLOSE_OTHER_SHAPES_POPOVER" });

		expect(next.isOtherShapesPopoverOpen).toBe(false);
		expect(next.selection).toBe(state.selection);
	});

	it("returns the same state when the popover is closed", () => {
		const state = createTestState(twoRectsDoc);

		expect(canvasReducer(state, { type: "CLOSE_OTHER_SHAPES_POPOVER" })).toBe(
			state,
		);
	});
});
