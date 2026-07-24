import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../../constants/zoom";
import type { Viewport } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { ZoomInCommand } from "../ZoomInCommand";
import { ZoomOutCommand } from "../ZoomOutCommand";

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

describe("ZoomOutCommand", () => {
	it("snaps zoom to the next fixed step down (100% -> 75%)", () => {
		const state = makeState({ zoom: 1 });
		const next = ZoomOutCommand.execute(state, registries);
		expect(next.viewport.zoom).toBe(0.75);
	});

	it("returns to the original step (100%) after zooming in then out", () => {
		const zoomedIn = ZoomInCommand.execute(makeState({ zoom: 1 }), registries);
		const back = ZoomOutCommand.execute(zoomedIn, registries);
		expect(back.viewport.zoom).toBe(1);
	});

	it("keeps the viewport center after zooming", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 2 });
		const before = centerOf(state.viewport);
		const after = centerOf(ZoomOutCommand.execute(state, registries).viewport);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("does not go below MIN", () => {
		const state = makeState({ zoom: ZOOM.MIN });
		const next = ZoomOutCommand.execute(state, registries);
		expect(next.viewport.zoom).toBe(ZOOM.MIN);
	});

	describe("canExecute", () => {
		it("is executable when greater than MIN", () => {
			expect(
				ZoomOutCommand.canExecute(makeState({ zoom: 1 }), registries),
			).toBe(true);
		});

		it("is not executable when MIN is reached", () => {
			expect(
				ZoomOutCommand.canExecute(makeState({ zoom: ZOOM.MIN }), registries),
			).toBe(false);
		});
	});
});
