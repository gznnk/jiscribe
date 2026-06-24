import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ResetZoomCommand } from "../ResetZoomCommand";

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
	it("zoom を 100%（1）に戻す", () => {
		const state = makeState({ zoom: 3.5 });
		const next = ResetZoomCommand.execute(state);
		expect(next.viewport.zoom).toBe(1);
	});

	it("リセット後もビューポート中心を維持する", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 3.5 });
		const before = centerOf(state.viewport);
		const after = centerOf(ResetZoomCommand.execute(state).viewport);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("既に 100% でも中心保持の no-op として処理する", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 1 });
		const next = ResetZoomCommand.execute(state);
		expect(next.viewport.zoom).toBe(1);
		expect(next.viewport.minX).toBe(100);
		expect(next.viewport.minY).toBe(200);
	});

	it("canExecute は常に true", () => {
		expect(ResetZoomCommand.canExecute(makeState({ zoom: 1 }))).toBe(true);
		expect(ResetZoomCommand.canExecute(makeState({ zoom: 5 }))).toBe(true);
	});
});
