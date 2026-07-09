import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { ResetZoomCommand } from "../ResetZoomCommand";

const registries = createTestRegistries();

const makeState = (viewport: Partial<Viewport>): CanvasControllerState =>
	({
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 1000,
			zoom: 1,
			...viewport,
		},
	}) as unknown as CanvasControllerState;

const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ResetZoomCommand", () => {
	it("resets zoom back to 100% (1)", () => {
		const state = makeState({ zoom: 3.5 });
		const next = ResetZoomCommand.execute(state, registries);
		expect(next.viewport.zoom).toBe(1);
	});

	it("keeps the viewport center after reset", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 3.5 });
		const before = centerOf(state.viewport);
		const after = centerOf(
			ResetZoomCommand.execute(state, registries).viewport,
		);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("treats an already 100% state as a center-preserving no-op", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 1 });
		const next = ResetZoomCommand.execute(state, registries);
		expect(next.viewport.zoom).toBe(1);
		expect(next.viewport.minX).toBe(100);
		expect(next.viewport.minY).toBe(200);
	});

	it("canExecute is always true", () => {
		expect(
			ResetZoomCommand.canExecute(makeState({ zoom: 1 }), registries),
		).toBe(true);
		expect(
			ResetZoomCommand.canExecute(makeState({ zoom: 5 }), registries),
		).toBe(true);
	});
});
