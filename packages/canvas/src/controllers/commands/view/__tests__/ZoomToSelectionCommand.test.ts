import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../states/canvas/Viewport";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ZoomToSelectionCommand } from "../ZoomToSelectionCommand";

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 200,
		height: 200,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makePolyline = (
	id: string,
	points: { x: number; y: number }[],
): PolylineState =>
	({ id, type: "polyline", points }) as unknown as PolylineState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	viewport?: Partial<Viewport>;
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 1000,
			zoom: 1,
			...params.viewport,
		},
	}) as unknown as CanvasControllerState;

const centerOf = (viewport: Viewport) => ({
	x: viewport.minX + viewport.width / (2 * viewport.zoom),
	y: viewport.minY + viewport.height / (2 * viewport.zoom),
});

describe("ZoomToSelectionCommand", () => {
	it("選択オブジェクトのバウンド中心へ寄せる（非選択は無視）", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: {
				a: makeRect("a", 500, 500),
				// 遠方の非選択オブジェクトは中心計算に影響しない
				b: makeRect("b", 5000, 5000),
			},
		});
		const next = ZoomToSelectionCommand.execute(state);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("選択コンテンツが収まる倍率を選ぶ（48px パディング込み）", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 500, 500) },
		});
		const next = ZoomToSelectionCommand.execute(state);
		// 200x200 → 904/200 = 4.52
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
	});

	it("片軸サイズ 0（水平な直線）でも有効な軸にフィットする", () => {
		// 水平ポリライン: 幅 200・高さ 0。高さ 0 を理由にフォールバック(zoom=1)しない
		const state = makeState({
			selectedIds: ["line"],
			objects: {
				line: makePolyline("line", [
					{ x: 400, y: 500 },
					{ x: 600, y: 500 },
				]),
			},
		});
		const next = ZoomToSelectionCommand.execute(state);
		// 幅 200 → 904/200 = 4.52 にフィット（高さ軸は候補から除外）
		expect(next.viewport.zoom).toBeCloseTo(4.52, 2);
		const center = centerOf(next.viewport);
		expect(center.x).toBeCloseTo(500, 2);
		expect(center.y).toBeCloseTo(500, 2);
	});

	it("両軸サイズ 0（全頂点一致の退化 Poly）は現在ビューを維持する（no-op）", () => {
		// 単一点に潰れた Poly は contentWidth=contentHeight=0。zoom 候補が無いため
		// 100% へのスナップ＋再センタリングをせず、現在のビューポートを維持する。
		const state = makeState({
			selectedIds: ["dot"],
			objects: {
				dot: makePolyline("dot", [
					{ x: 500, y: 500 },
					{ x: 500, y: 500 },
				]),
			},
			viewport: { minX: 123, minY: 456, zoom: 2 },
		});
		expect(ZoomToSelectionCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("選択があれば実行可能", () => {
			expect(
				ZoomToSelectionCommand.canExecute(
					makeState({
						selectedIds: ["a"],
						objects: { a: makeRect("a", 0, 0) },
					}),
				),
			).toBe(true);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				ZoomToSelectionCommand.canExecute(
					makeState({ selectedIds: [], objects: {} }),
				),
			).toBe(false);
		});
	});
});
