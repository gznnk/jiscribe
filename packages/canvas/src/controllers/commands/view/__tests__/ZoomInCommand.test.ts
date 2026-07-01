import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../../constants/zoom";
import type { Viewport } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ZoomInCommand } from "../ZoomInCommand";

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

// Compute the viewport center (in content coordinates)
const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ZoomInCommand", () => {
	it("snaps zoom to the next fixed step up (100% -> 125%)", () => {
		const state = makeState({ zoom: 1 });
		const next = ZoomInCommand.execute(state);
		expect(next.viewport.zoom).toBe(1.25);
	});

	it("snaps to the nearest step up (125%) from a mid-step value (116%)", () => {
		const state = makeState({ zoom: 1.16 });
		const next = ZoomInCommand.execute(state);
		expect(next.viewport.zoom).toBe(1.25);
	});

	it("keeps the viewport center after zooming", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 2 });
		const before = centerOf(state.viewport);
		const after = centerOf(ZoomInCommand.execute(state).viewport);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("does not exceed MAX", () => {
		const state = makeState({ zoom: ZOOM.MAX });
		const next = ZoomInCommand.execute(state);
		expect(next.viewport.zoom).toBe(ZOOM.MAX);
	});

	describe("canExecute", () => {
		it("is executable when below MAX", () => {
			expect(ZoomInCommand.canExecute(makeState({ zoom: 1 }))).toBe(true);
		});

		it("is not executable when MAX is reached", () => {
			expect(ZoomInCommand.canExecute(makeState({ zoom: ZOOM.MAX }))).toBe(
				false,
			);
		});
	});
});
