import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

describe("canvasReducer / CLOSE_MODAL", () => {
	it("clears the open modal", () => {
		const state = createTestState(twoRectsDoc, { activeModal: "export" });

		const next = canvasReducer(state, { type: "CLOSE_MODAL" });

		expect(next.activeModal).toBeNull();
	});

	it("returns the same state when no modal is open", () => {
		const state = createTestState(twoRectsDoc);

		expect(canvasReducer(state, { type: "CLOSE_MODAL" })).toBe(state);
	});
});
