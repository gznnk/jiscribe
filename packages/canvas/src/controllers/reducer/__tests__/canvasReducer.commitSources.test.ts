import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import type { CanvasAction } from "../CanvasActions";
import { canvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";
import { runCommands } from "./support/dispatch";
import { twoRectsDoc } from "./support/fixtures";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

const createState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

/**
 * 各イベント源が「履歴を記録するか」を 1 箇所で俯瞰するテスト。
 * recordHistoryIfNeeded を通る経路（COMMAND/PASTE/MENU/END_TEXT_EDIT）が
 * commitVersion 変化時にだけ past を積むことを確認する。
 * GESTURE も canvasReducer 上は COMMAND と同一の recordHistoryIfNeeded 配管を
 * 共有するため、ここでは個別のジェスチャ構築はせず代表経路で代替する。
 */
describe("canvasReducer（結合）", () => {
	describe("コミット源ごとの履歴記録", () => {
		it("COMMAND（削除）は履歴を記録する", () => {
			const state = createState();
			const after = runCommands(state, "delete");
			expect(after.history.past).toHaveLength(1);
		});

		it("canExecute=false のコマンド（空 past での undo）は記録しない", () => {
			const state = createState();
			const after = runCommands(state, "undo");
			expect(after.history.past).toHaveLength(0);
			expect(after).toBe(state); // 状態は不変
		});

		it("PASTE は履歴を記録する", () => {
			const state = createState();
			// 実 state のオブジェクトを使ってバリデータを通る ClipboardData を組む
			const clipboard: ClipboardData = {
				__type: "jiscribe-canvas-clipboard",
				version: 1,
				objects: { "rect-2": state.objects["rect-2"] },
				rootIds: ["rect-2"],
				center: { x: 105, y: 105 },
			};
			const paste: CanvasAction = { type: "PASTE", data: clipboard };
			const after = canvasReducer(state, paste);
			expect(after.history.past).toHaveLength(1);
		});

		it("MENU_PROPERTY_UPDATE は commit:true で記録し commit:false（プレビュー）では記録しない", () => {
			const state = createState();

			const preview = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: false,
			});
			expect(preview.history.past).toHaveLength(0);

			const committed = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: true,
			});
			expect(committed.history.past).toHaveLength(1);
		});

		it("END_TEXT_EDIT は確定でテキストが変わったとき記録する", () => {
			const state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			const after = canvasReducer(state, {
				type: "END_TEXT_EDIT",
				commit: true,
			});
			expect(after.history.past).toHaveLength(1);
			expect(after.textEditState).toBeNull();
		});

		it("END_TEXT_EDIT のキャンセルは記録せず textEditState だけクリアする", () => {
			const state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			const after = canvasReducer(state, {
				type: "END_TEXT_EDIT",
				commit: false,
			});
			expect(after.history.past).toHaveLength(0);
			expect(after.textEditState).toBeNull();
		});

		it("END_TEXT_EDIT 確定でもテキストが変わっていなければ記録しない", () => {
			let state = createTestState(twoRectsDoc, {
				selectedIds: ["rect-1"],
				textEditState: { objectId: "rect-1", text: "hello" },
			});
			// 1 回目: テキストが変わるので記録される
			state = canvasReducer(state, { type: "END_TEXT_EDIT", commit: true });
			expect(state.history.past).toHaveLength(1);

			// 同じテキストでもう一度確定 → 差分なしで commitVersion が上がらず記録されない
			state = {
				...state,
				textEditState: { objectId: "rect-1", text: "hello" },
			};
			state = canvasReducer(state, { type: "END_TEXT_EDIT", commit: true });
			expect(state.history.past).toHaveLength(1);
			expect(state.textEditState).toBeNull();
		});

		it("MENU_PROPERTY_UPDATE は preview → commit と続けても記録は 1 回だけ", () => {
			let state = createState();
			// プレビュー（commit:false）は記録しない
			state = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: false,
			});
			expect(state.history.past).toHaveLength(0);

			// 確定（commit:true）で初めて 1 エントリ積まれる（プレビュー分は二重に積まれない）
			state = canvasReducer(state, {
				type: "MENU_PROPERTY_UPDATE",
				property: "fill",
				value: "#ff0000",
				commit: true,
			});
			expect(state.history.past).toHaveLength(1);
		});
	});
});
