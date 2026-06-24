import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { UndoCommand } from "../UndoCommand";

// canvasToState が objectMapperRegistry を使うため初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docCurrent = {
	version: 1,
	root: [rect("r1"), rect("r2")],
} as unknown as CanvasDoc;

const makeState = (params: {
	past: CanvasDoc[];
	present: CanvasDoc;
	future: CanvasDoc[];
	eventStartSnapshot?: unknown;
	textEditState?: unknown;
}): CanvasControllerState =>
	({
		history: {
			past: params.past,
			present: params.present,
			future: params.future,
		},
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: params.eventStartSnapshot ?? null,
		textEditState: params.textEditState ?? null,
		internalClipboard: null,
		commitVersion: 5,
		saveVersion: 0,
	}) as unknown as CanvasControllerState;

describe("UndoCommand", () => {
	it("直前の履歴を復元し present を巻き戻す", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state);

		// docPrev（r1 のみ）が復元される
		expect(Object.keys(next.objects)).toEqual(["r1"]);
		expect(next.history.present).toBe(docPrev);
		expect(next.history.past).toEqual([]);
		// 巻き戻した present は future へ退避される
		expect(next.history.future).toEqual([docCurrent]);
	});

	it("選択を解除し saveVersion を増分・commitVersion は据え置く", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		const next = UndoCommand.execute(state);
		expect(next.selectedIds).toEqual([]);
		expect(next.saveVersion).toBe(1);
		// 履歴復元はコミットではないので commitVersion は変えない
		expect(next.commitVersion).toBe(5);
	});

	it("viewport は維持する", () => {
		const state = makeState({
			past: [docPrev],
			present: docCurrent,
			future: [],
		});
		expect(UndoCommand.execute(state).viewport).toEqual(state.viewport);
	});

	it("past が空なら state をそのまま返す", () => {
		const state = makeState({ past: [], present: docCurrent, future: [] });
		expect(UndoCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("past があれば実行可能", () => {
			expect(
				UndoCommand.canExecute(
					makeState({ past: [docPrev], present: docCurrent, future: [] }),
				),
			).toBe(true);
		});

		it("past が空なら実行不可", () => {
			expect(
				UndoCommand.canExecute(
					makeState({ past: [], present: docCurrent, future: [] }),
				),
			).toBe(false);
		});

		it("ドラッグ中は実行不可", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [docPrev],
						present: docCurrent,
						future: [],
						eventStartSnapshot: { foo: 1 },
					}),
				),
			).toBe(false);
		});

		it("テキスト編集中は実行不可", () => {
			expect(
				UndoCommand.canExecute(
					makeState({
						past: [docPrev],
						present: docCurrent,
						future: [],
						textEditState: { objectId: "r1", text: "" },
					}),
				),
			).toBe(false);
		});
	});
});
