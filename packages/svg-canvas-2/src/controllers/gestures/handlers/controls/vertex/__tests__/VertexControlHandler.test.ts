import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { VertexControlHandler } from "../VertexControlHandler";

const handler = new VertexControlHandler();

const makePoly = (id: string, points: Point[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown;

/**
 * 頂点ドラッグ中の state を組み立てる。snapCandidates を null にしてオブジェクト間
 * スナップを無効化し、Shift 軸固定ロジックだけを検証できるようにする。
 */
const makeDragState = (points: Point[]): CanvasControllerState => {
	const poly = makePoly("poly-1", points);
	return {
		objects: { "poly-1": poly },
		rootIds: ["poly-1"],
		selectedIds: [],
		selectedVertex: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "poly-1": poly },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const makeDragEvent = (
	last: Point,
	shift: boolean,
	vertexIndex = 0,
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: `vertex-control:poly-1:${vertexIndex}`,
		button: 0,
		last,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const vertexAt = (state: CanvasControllerState, index: number) =>
	(state.objects["poly-1"] as unknown as { points: Point[] }).points[index];

describe("VertexControlHandler - Shift 軸固定", () => {
	it("Shift なしではカーソル位置どおりに頂点が動き、フィードバックは出ない", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 30, y: 12 }, false),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 12 });
		expect(next.axisLockFeedback).toBeNull();
	});

	it("Shift + 横方向優位では Y を開始位置に固定し X だけ動く", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 70, y: 38 }, true),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 70, y: 30 });
		expect(next.axisLockFeedback).toEqual({ y: 30 });
	});

	it("Shift + 縦方向優位では X を開始位置に固定し Y だけ動く", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 25, y: 80 }, true),
		);
		expect(vertexAt(next, 0)).toEqual({ x: 20, y: 80 });
		expect(next.axisLockFeedback).toEqual({ x: 20 });
	});

	describe("原点スナップ（開始頂点付近）", () => {
		it("フリー軸の移動量がしきい値以下なら開始頂点へ吸着し両軸ガイドを出す", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=4(優位/フリー軸), dy=3 → 4 <= 6px(zoom=1) で原点吸着
				makeDragEvent({ x: 24, y: 33 }, true),
			);
			expect(vertexAt(next, 0)).toEqual({ x: 20, y: 30 });
			expect(next.axisLockFeedback).toEqual({ x: 20, y: 30 });
		});

		it("しきい値を超えると吸着が外れ片軸固定に戻る", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=8 > 6px → Y 固定の横移動
				makeDragEvent({ x: 28, y: 33 }, true),
			);
			expect(vertexAt(next, 0)).toEqual({ x: 28, y: 30 });
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});
	});
});
