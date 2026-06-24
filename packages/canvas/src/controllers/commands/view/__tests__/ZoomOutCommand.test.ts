import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../../constants/zoom";
import type { Viewport } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ZoomOutCommand } from "../ZoomOutCommand";

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
	it("zoom を OUT_FACTOR 倍する", () => {
		const state = makeState({ zoom: 1 });
		const next = ZoomOutCommand.execute(state);
		expect(next.viewport.zoom).toBe(ZOOM.OUT_FACTOR);
	});

	it("ズーム後もビューポート中心を維持する", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 2 });
		const before = centerOf(state.viewport);
		const after = centerOf(ZoomOutCommand.execute(state).viewport);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("MIN を下回らない", () => {
		const state = makeState({ zoom: ZOOM.MIN });
		const next = ZoomOutCommand.execute(state);
		expect(next.viewport.zoom).toBe(ZOOM.MIN);
	});

	describe("canExecute", () => {
		it("MIN より大きければ実行可能", () => {
			expect(ZoomOutCommand.canExecute(makeState({ zoom: 1 }))).toBe(true);
		});

		it("MIN に達していたら実行不可", () => {
			expect(ZoomOutCommand.canExecute(makeState({ zoom: ZOOM.MIN }))).toBe(
				false,
			);
		});
	});
});
