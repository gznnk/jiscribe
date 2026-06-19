import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import {
	DUPLICATE_OFFSET,
	computeDuplicateOffset,
} from "../computeDuplicateOffset";

// ---------------------------------------------------------------------------
// テスト用フィクスチャ
// ---------------------------------------------------------------------------

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeState = (
	params: Partial<CanvasControllerState> & {
		selectedIds: string[];
		objects: Record<string, ObjectState>;
	},
): CanvasControllerState =>
	({
		multiSelectGroup: null,
		lastDuplicate: null,
		...params,
	}) as unknown as CanvasControllerState;

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("computeDuplicateOffset", () => {
	it("lastDuplicate が無い → 既定オフセット", () => {
		const state = makeState({ selectedIds: ["r1"], objects: {} });
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("選択数が直前の複製結果と異なる → 既定オフセット", () => {
		const r1 = makeRect("r1", 0, 0);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1", "r2"],
				cx: 0,
				cy: 0,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("選択 ID が直前の複製結果と一致しない → 既定オフセット", () => {
		const r1 = makeRect("r1", 0, 0);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["other"],
				cx: 0,
				cy: 0,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("選択一致 + 1px 以上移動 → 移動量を新オフセットとして採用", () => {
		const r1 = makeRect("r1", 30, 50);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1"],
				cx: 10,
				cy: 10,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 20, y: 40 });
	});

	it("選択一致 + ほぼ未移動（1px 未満）→ 前回オフセットを継続", () => {
		const r1 = makeRect("r1", 10.5, 10.5);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1"],
				cx: 10,
				cy: 10,
				offset: { x: 7, y: 7 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 7, y: 7 });
	});

	it("選択一致だが中心が取得できない → 前回オフセットを継続", () => {
		const state = makeState({
			selectedIds: ["gone"],
			objects: {},
			lastDuplicate: {
				newIds: ["gone"],
				cx: 10,
				cy: 10,
				offset: { x: 9, y: 9 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 9, y: 9 });
	});
});
