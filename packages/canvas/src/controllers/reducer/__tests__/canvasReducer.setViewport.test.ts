import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

const createState = (): CanvasControllerState => createTestState(twoRectsDoc);

// Camera shape inlined (minX/minY/zoom) to keep this test's import set aligned
// with the sibling reducer tests; SET_VIEWPORT carries exactly this.
const setViewport = (camera: {
	minX: number;
	minY: number;
	zoom: number;
}): CanvasAction => ({
	type: "SET_VIEWPORT",
	camera,
});

describe("canvasReducer / SET_VIEWPORT", () => {
	it("adopts the host camera while keeping the container-measured width/height", () => {
		const state = createState();
		// Baseline from CanvasMapper: width/height are internally measured.
		expect(state.viewport.width).toBe(1000);
		expect(state.viewport.height).toBe(800);

		const next = canvasReducer(
			state,
			setViewport({ minX: 10, minY: 20, zoom: 2 }),
		);

		expect(next.viewport).toEqual({
			minX: 10,
			minY: 20,
			zoom: 2,
			// unchanged — the host does not control pixel dimensions
			width: 1000,
			height: 800,
		});
	});

	it("no-ops (returns the same reference) when the camera is unchanged", () => {
		// This guard is what stops the controlled-viewport round-trip (host echoes
		// the emitted camera back into the `viewport` prop) from churning state.
		const state = canvasReducer(
			createState(),
			setViewport({ minX: 10, minY: 20, zoom: 2 }),
		);

		const echoed = canvasReducer(
			state,
			setViewport({ minX: 10, minY: 20, zoom: 2 }),
		);

		expect(echoed).toBe(state);
	});

	it("does not record history or bump save/commit versions (viewport is not part of the doc)", () => {
		const state = createState();

		const next = canvasReducer(
			state,
			setViewport({ minX: 5, minY: 5, zoom: 0.5 }),
		);

		expect(next.history).toBe(state.history);
		expect(next.saveVersion).toBe(state.saveVersion);
		expect(next.commitVersion).toBe(state.commitVersion);
	});
});
