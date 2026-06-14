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

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

/**
 * ドラッグ中の state を組み立てる。snapCandidates を null にしてスナップ補正を無効化し、
 * Shift 軸固定ロジックだけを検証できるようにする。
 */
const makeDragState = (): CanvasControllerState => {
	const rect = makeRect("rect-1", 0, 0);
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
			keyPoints: {},
			snapCandidates: null,
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
	it("Shift なしでは両軸が移動する", () => {
		const next = ObjectEventHandler.handle(
			makeDragState(),
			makeDragEvent({ x: 30, y: 12 }, false),
		);
		expect(movedRect(next)).toMatchObject({ cx: 30, cy: 12 });
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
});
