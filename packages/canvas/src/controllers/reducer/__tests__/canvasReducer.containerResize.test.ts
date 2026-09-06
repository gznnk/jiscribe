import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";

const canvasReducer = createCanvasReducer(createTestRegistries());

/** Baseline state at minX 100 / minY 50, with the camera set to `zoom`. */
const createState = (zoom = 1): CanvasControllerState => {
	const state = createTestState(twoRectsDoc);
	return canvasReducer(state, {
		type: "SET_CAMERA",
		camera: { minX: 100, minY: 50, zoom },
	});
};

const resize = (
	dimensions: { width: number; height: number },
	leftEdgeShift?: number,
): CanvasAction => ({
	type: "CONTAINER_RESIZE",
	dimensions,
	...(leftEdgeShift === undefined ? {} : { leftEdgeShift }),
});

describe("canvasReducer / CONTAINER_RESIZE", () => {
	it("adopts the measured size, leaving the camera alone", () => {
		const next = canvasReducer(
			createState(),
			resize({ width: 760, height: 800 }),
		);

		expect(next.viewport).toEqual({
			minX: 100,
			minY: 50,
			zoom: 1,
			width: 760,
			height: 800,
		});
	});

	it("keeps the camera when the left edge held still (shift of 0)", () => {
		const next = canvasReducer(
			createState(),
			resize({ width: 760, height: 800 }, 0),
		);

		expect(next.viewport.minX).toBe(100);
	});

	it("moves minX by the shift at zoom 1, pinning the drawing to the screen", () => {
		// The sidebar opening pushes the viewport's left edge 240px right; the same
		// 240px has to come off the world offset the edge measures from.
		const next = canvasReducer(
			createState(),
			resize({ width: 760, height: 800 }, 240),
		);

		expect(next.viewport.minX).toBe(340);
		expect(next.viewport.width).toBe(760);
	});

	it("converts the shift to world units with the current zoom", () => {
		// 240 screen px at zoom 2 is 120 world units
		const next = canvasReducer(
			createState(2),
			resize({ width: 760, height: 800 }, 240),
		);

		expect(next.viewport.minX).toBe(220);
	});

	it("moves minX back when the left edge returns (a negative shift)", () => {
		const opened = canvasReducer(
			createState(),
			resize({ width: 760, height: 800 }, 240),
		);
		const closed = canvasReducer(
			opened,
			resize({ width: 1000, height: 800 }, -240),
		);

		expect(closed.viewport.minX).toBe(100);
	});
});
