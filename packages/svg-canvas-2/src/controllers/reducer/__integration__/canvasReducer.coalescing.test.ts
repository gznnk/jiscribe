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
	describe("履歴の集約（連続ナッジ）", () => {
		it("連続したナッジは past を増やさず 1 エントリにまとめる", () => {
			let state = createState();
			state = runCommands(state, "move-right");
			// 1 回目: 移動前の状態が past に積まれる
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "move-right", "move-right");
			// 2・3 回目は集約され past は増えない
			expect(state.history.past).toHaveLength(1);
			expect(cxOf(state)).toBe(8); // 5 + 1 * 3
		});

		it("集約後の 1 回の undo でナッジ前まで戻る", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-right");
			expect(cxOf(state)).toBe(7);

			state = runCommands(state, "undo");
			expect(cxOf(state)).toBe(5); // ナッジ前まで一括で戻る
			expect(state.history.past).toHaveLength(0);
		});

		it("別操作（削除）を挟むと集約境界になり別エントリになる", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-right");
			expect(state.history.past).toHaveLength(1);

			state = runCommands(state, "delete");
			// 削除は pending を立てないため past が増え、recorded も集約境界（null）になる
			expect(state.history.past).toHaveLength(2);
			expect(state.historyCoalesce.recorded).toBeNull();
			expect(state.historyCoalesce.pending).toBeNull();
		});

		it("方向が違っても連続ナッジとして集約される", () => {
			let state = createState();
			state = runCommands(state, "move-right", "move-up", "move-left-large");
			expect(state.history.past).toHaveLength(1);
		});

		it("別の図形を選択してナッジすると別の undo エントリになる（選択を跨いで集約しない）", () => {
			let state = createState(); // rect-1 を選択
			state = runCommands(state, "move-right", "move-right");
			expect(state.history.past).toHaveLength(1);

			// 別の図形を選択（クリック選択を模擬。集約キーが move:rect-2 に変わる）
			state = { ...state, selectedIds: ["rect-2"] };
			state = runCommands(state, "move-right");
			expect(state.history.past).toHaveLength(2);
		});
	});
});
