import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import {
	canvasToDoc,
	canvasToState,
} from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import { initializeCommands } from "../../setup/initializeCommands";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { canvasReducer } from "../canvasReducer";

beforeAll(() => {
	initializeObjectRegistry();
	initializeCommands();
});

// x=0,y=0,w=10,h=10 → cx=5, cy=5
const baseDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		},
		{
			id: "rect-2",
			type: "rect",
			x: 100,
			y: 100,
			width: 10,
			height: 10,
		},
	],
	connectors: [],
} as unknown as CanvasDoc;

const createState = (): CanvasControllerState => {
	const baseState = canvasToState(baseDoc);
	return {
		...baseState,
		selectedIds: ["rect-1"],
		eventStartSnapshot: null,
		keyPointsCache: {},
		snapCandidatesCache: null,
		edgeScrollEnabled: false,
		commitVersion: 0,
		saveVersion: 0,
		saveNonce: "",
		historyCoalesce: { recorded: null, pending: null },
		contextMenuPosition: null,
		shapeLibraryDrag: null,
		areaSelection: null,
		objectMenuOpenId: null,
		multiSelectGroup: null,
		textEditState: null,
		pendingConnector: null,
		selectedConnectorId: null,
		selectedVertex: null,
		editingConnectorId: null,
		editingEndpoint: null,
		snapFeedback: null,
		shapeDrawing: null,
		lastDuplicate: null,
		internalClipboard: null,
		history: {
			past: [],
			present: canvasToDoc(baseState),
			future: [],
		},
	} as unknown as CanvasControllerState;
};

const move = (state: CanvasControllerState, commandId: string) =>
	canvasReducer(state, { type: "COMMAND", commandId });

const cxOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { cx: number }).cx;

describe("canvasReducer", () => {
	describe("履歴の集約（連続ナッジ）", () => {
		it("連続したナッジは past を増やさず 1 エントリにまとめる", () => {
			let state = createState();
			state = move(state, "move-right");
			// 1 回目: 移動前の状態が past に積まれる
			expect(state.history.past).toHaveLength(1);

			state = move(state, "move-right");
			state = move(state, "move-right");
			// 2・3 回目は集約され past は増えない
			expect(state.history.past).toHaveLength(1);
			expect(cxOf(state)).toBe(8); // 5 + 1 * 3
		});

		it("集約後の 1 回の undo でナッジ前まで戻る", () => {
			let state = createState();
			state = move(state, "move-right");
			state = move(state, "move-right");
			expect(cxOf(state)).toBe(7);

			state = move(state, "undo");
			expect(cxOf(state)).toBe(5); // ナッジ前まで一括で戻る
			expect(state.history.past).toHaveLength(0);
		});

		it("別操作（削除）を挟むと集約境界になり別エントリになる", () => {
			let state = createState();
			state = move(state, "move-right");
			state = move(state, "move-right");
			expect(state.history.past).toHaveLength(1);

			state = move(state, "delete");
			// 削除は pending を立てないため past が増え、recorded も集約境界（null）になる
			expect(state.history.past).toHaveLength(2);
			expect(state.historyCoalesce.recorded).toBeNull();
			expect(state.historyCoalesce.pending).toBeNull();
		});

		it("方向が違っても連続ナッジとして集約される", () => {
			let state = createState();
			state = move(state, "move-right");
			state = move(state, "move-up");
			state = move(state, "move-left-large");
			expect(state.history.past).toHaveLength(1);
		});

		it("別の図形を選択してナッジすると別の undo エントリになる（選択を跨いで集約しない）", () => {
			let state = createState(); // rect-1 を選択
			state = move(state, "move-right");
			state = move(state, "move-right");
			expect(state.history.past).toHaveLength(1);

			// 別の図形を選択（クリック選択を模擬。集約キーが move:rect-2 に変わる）
			state = { ...state, selectedIds: ["rect-2"] };
			state = move(state, "move-right");
			expect(state.history.past).toHaveLength(2);
		});
	});
});
