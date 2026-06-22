import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { CanvasAction } from "../CanvasActions";
import { canvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
});

const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, {
		selectedIds: ["rect-1"],
		saveNonce: "nonce-self",
		// 直前操作で集約マーカーが残っている状況を再現する
		historyCoalesce: {
			recorded: { key: "move:rect-1", time: Date.now() },
			pending: null,
		},
	});

// rect-1 を x=50 に動かした外部ドキュメント（cx=55 に変換される）
const movedDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-1", 50, 0), rectDoc("rect-2", 100, 100)],
} as unknown as CanvasDoc;

const syncExternal = (saveNonce?: string): CanvasAction => ({
	type: "SYNC_EXTERNAL",
	payload: canvasToState(movedDoc),
	saveNonce,
});

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer（結合）", () => {
	describe("SYNC_EXTERNAL", () => {
		it("saveNonce が一致する自己折り返しは objects だけ更新し history を保持する", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-self"));

			// objects は外部 payload で差し替わる
			expect(cxOf(after)).toBe(55);
			// history は一切触らない（past を積まない）
			expect(after.history).toBe(state.history);
			// 集約状態・選択も維持
			expect(after.historyCoalesce).toBe(state.historyCoalesce);
			expect(after.selectedIds).toEqual(["rect-1"]);
		});

		it("saveNonce が一致しない本物の外部変更は present を past に積む", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-other"));

			expect(cxOf(after)).toBe(55);
			expect(after.history.past).toHaveLength(1);
			expect(after.history.future).toHaveLength(0);
		});

		it("saveNonce 省略時も外部変更として扱う", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal(undefined));
			expect(after.history.past).toHaveLength(1);
		});

		it("外部変更は履歴境界として選択と集約状態をリセットする", () => {
			const state = createState();
			const after = canvasReducer(state, syncExternal("nonce-other"));

			expect(after.selectedIds).toEqual([]);
			expect(after.historyCoalesce.recorded).toBeNull();
			expect(after.historyCoalesce.pending).toBeNull();
		});
	});
});
