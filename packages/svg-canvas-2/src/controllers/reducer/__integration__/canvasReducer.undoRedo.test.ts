import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestState } from "./support/createTestState";
import { runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

// rect-1 を選択した状態から開始する（cx=5,cy=5）
const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer（結合）", () => {
	describe("undo / redo", () => {
		it("undo で直前のコミットを取り消し、redo で再適用する", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			expect(cxOf(state)).toBe(6);
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "undo");
			expect(cxOf(state)).toBe(5); // ナッジ前に戻る
			expect(state.history.past).toHaveLength(0);
			expect(state.history.future).toHaveLength(1);

			state = runCommands(state, "redo");
			expect(cxOf(state)).toBe(6); // 再適用される
			expect(state.history.past).toHaveLength(1);
			expect(state.history.future).toHaveLength(0);
		});

		it("undo/redo は commitVersion を進めず、二重に履歴へ積まれない", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			const committedVersion = state.commitVersion;

			state = runCommands(state, "undo");
			expect(state.commitVersion).toBe(committedVersion);
			// undo 自体は past を増やさず future へ移すだけ
			expect(state.history.past).toHaveLength(0);

			state = runCommands(state, "redo");
			expect(state.commitVersion).toBe(committedVersion);
			expect(state.history.past).toHaveLength(1);
		});

		it("past が空のときの undo は no-op（状態は変化しない）", () => {
			const state = createState();
			const after = runCommands(state, "undo");
			expect(after).toBe(state); // 参照ごと不変
		});

		it("undo 後に新しいコミットを行うと future がクリアされる", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			state = runCommands(state, "undo");
			expect(state.history.future).toHaveLength(1);

			// undo は選択を解除するため、新しい操作の前に rect-1 を選び直す
			state = { ...state, selectedIds: ["rect-1"] };
			// undo で復元した分岐を捨て、新しい操作で履歴を分岐させる
			state = runCommands(state, "delete");
			expect(state.history.future).toHaveLength(0);
			expect(state.history.past).toHaveLength(1);
		});

		it("undo は履歴ナビゲーションなので集約状態をリセットする", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			// 直前ナッジで recorded がセットされている
			expect(state.historyCoalesce.recorded).not.toBeNull();

			state = runCommands(state, "undo");
			expect(state.historyCoalesce.recorded).toBeNull();
			expect(state.historyCoalesce.pending).toBeNull();
		});
	});
});
