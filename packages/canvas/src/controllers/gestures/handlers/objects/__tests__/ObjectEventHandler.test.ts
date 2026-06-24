import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../../setup/initializeObjectRegistry";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ObjectEventHandler } from "../ObjectEventHandler";

// moveByDelta は objectBehaviorRegistry 経由で解決されるため、レジストリを初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const SIZE = 10;

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: SIZE,
		height: SIZE,
	}) as unknown as ObjectState;

/** rect の4隅＋中点から keyPoints を作る（calcKeyPointsBoundingBox は4隅のみ参照）*/
const makeKeyPoints = (cx: number, cy: number) => {
	const half = SIZE / 2;
	const left = cx - half;
	const right = cx + half;
	const top = cy - half;
	const bottom = cy + half;
	return {
		topLeft: { x: left, y: top },
		topCenter: { x: cx, y: top },
		topRight: { x: right, y: top },
		rightCenter: { x: right, y: cy },
		bottomRight: { x: right, y: bottom },
		bottomCenter: { x: cx, y: bottom },
		bottomLeft: { x: left, y: bottom },
		leftCenter: { x: left, y: cy },
	};
};

/**
 * ドラッグ中の state を組み立てる。snapCandidates を null にしてスナップ補正を無効化し、
 * Shift 軸固定ロジックだけを検証できるようにする。keyPoints は軸固定フィードバックの
 * 線位置（中心座標）算出に使われる。
 */
const makeDragState = (cx = 0, cy = 0): CanvasControllerState => {
	const rect = makeRect("rect-1", cx, cy);
	return {
		objects: { "rect-1": rect },
		rootIds: ["rect-1"],
		selectedIds: ["rect-1"],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		textEditState: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "rect-1": rect },
			keyPoints: { "rect-1": makeKeyPoints(cx, cy) },
			snapCandidates: { x: [], y: [] },
			selectedIds: ["rect-1"],
			selectedIdsWithDescendants: new Set(["rect-1"]),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const makeDragEvent = (
	delta: { x: number; y: number },
	shift: boolean,
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "object",
		targetId: "rect-1",
		button: 0,
		delta,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const movedRect = (state: CanvasControllerState) =>
	state.objects["rect-1"] as unknown as { cx: number; cy: number };

describe("ObjectEventHandler - Shift 軸固定ドラッグ", () => {
	it("Shift なしでは両軸が移動し、軸固定フィードバックは出ない", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 30, y: 12 }, false),
		);
		expect(movedRect(next)).toMatchObject({ cx: 30, cy: 12 });
		expect(next.axisLockFeedback).toBeNull();
	});

	it("Shift + 横方向優位（|dx| >= |dy|）では Y を固定し X だけ動く", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 30, y: 12 }, true),
		);
		expect(movedRect(next)).toMatchObject({ cx: 30, cy: 0 });
	});

	it("Shift + 縦方向優位（|dy| > |dx|）では X を固定し Y だけ動く", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 8, y: 25 }, true),
		);
		expect(movedRect(next)).toMatchObject({ cx: 0, cy: 25 });
	});

	it("累積 delta の優位軸が入れ替わると固定軸も追従する", () => {
		// 1 回目: 横優位 → X 移動・Y 固定
		const afterX = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 20, y: 5 }, true),
		);
		expect(movedRect(afterX)).toMatchObject({ cx: 20, cy: 0 });

		// 2 回目: 同じドラッグの続きで縦優位に切り替わる → X 固定・Y 移動
		// drag は eventStartSnapshot 起点の累積 delta なので、開始 state から再評価される
		const afterY = ObjectEventHandler.handle(
			afterX,
			makeDragEvent({ x: 6, y: 40 }, true),
		);
		expect(movedRect(afterY)).toMatchObject({ cx: 0, cy: 40 });
	});

	describe("軸固定フィードバック", () => {
		it("横移動（Y 固定）では中心 Y を通る横線（y のみ）を返す", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 50, y: 8 }, true),
			);
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});

		it("縦移動（X 固定）では中心 X を通る縦線（x のみ）を返す", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 8, y: 50 }, true),
			);
			expect(next.axisLockFeedback).toEqual({ x: 20 });
		});

		it("優位軸が入れ替わるとフィードバックの軸も切り替わる", () => {
			const afterX = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 40, y: 5 }, true),
			);
			expect(afterX.axisLockFeedback).toEqual({ y: 30 });

			const afterY = ObjectEventHandler.handle(
				afterX,
				makeDragEvent({ x: 5, y: 40 }, true),
			);
			expect(afterY.axisLockFeedback).toEqual({ x: 20 });
		});
	});

	describe("原点スナップ（軸固定中・開始位置付近）", () => {
		it("フリー軸の移動量がしきい値以下なら開始位置へ吸着する", () => {
			// |dx|=4 が優位 → Y 固定・X がフリー軸。X 移動量 4 <= 6px(zoom=1) なので原点吸着
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, true),
			);
			expect(movedRect(next)).toMatchObject({ cx: 20, cy: 30 });
		});

		it("原点スナップ中は両軸（十字）のガイドを返す", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, true),
			);
			expect(next.axisLockFeedback).toEqual({ x: 20, y: 30 });
		});

		it("しきい値を超えると吸着が外れ片軸固定に戻る", () => {
			// X 移動量 8 > 6px → 原点を抜けて Y 固定の横移動
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 8, y: 3 }, true),
			);
			expect(movedRect(next)).toMatchObject({ cx: 28, cy: 30 });
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});

		it("Shift なしでは原点付近でも吸着しない", () => {
			const next = ObjectEventHandler.handle(
				makeDragState(20, 30),
				makeDragEvent({ x: 4, y: 3 }, false),
			);
			expect(movedRect(next)).toMatchObject({ cx: 24, cy: 33 });
			expect(next.axisLockFeedback).toBeNull();
		});
	});
});
