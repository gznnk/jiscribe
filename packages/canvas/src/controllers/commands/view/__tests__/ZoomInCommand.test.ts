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

// ビューポート中心（コンテンツ座標）を求める
const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ZoomInCommand", () => {
	it("zoom を IN_FACTOR 倍する", () => {
		const state = makeState({ zoom: 1 });
		const next = ZoomInCommand.execute(state);
		expect(next.viewport.zoom).toBe(ZOOM.IN_FACTOR);
	});

	it("ズーム後もビューポート中心を維持する", () => {
		const state = makeState({ minX: 100, minY: 200, zoom: 2 });
		const before = centerOf(state.viewport);
		const after = centerOf(ZoomInCommand.execute(state).viewport);
		expect(after.x).toBeCloseTo(before.x, 3);
		expect(after.y).toBeCloseTo(before.y, 3);
	});

	it("MAX を超えない", () => {
		const state = makeState({ zoom: ZOOM.MAX });
		const next = ZoomInCommand.execute(state);
		expect(next.viewport.zoom).toBe(ZOOM.MAX);
	});

	describe("canExecute", () => {
		it("MAX 未満なら実行可能", () => {
			expect(ZoomInCommand.canExecute(makeState({ zoom: 1 }))).toBe(true);
		});

		it("MAX に達していたら実行不可", () => {
			expect(ZoomInCommand.canExecute(makeState({ zoom: ZOOM.MAX }))).toBe(
				false,
			);
		});
	});
});
