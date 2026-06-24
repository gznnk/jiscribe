import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { RedoCommand } from "../RedoCommand";

beforeAll(() => {
	initializeObjectRegistry();
});

const rect = (id: string) =>
	({ id, type: "rect", x: 0, y: 0, width: 100, height: 100 }) as never;

const docPrev = { version: 1, root: [rect("r1")] } as unknown as CanvasDoc;
const docNext = {
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

describe("RedoCommand", () => {
	it("future の先頭を復元し present を進める", () => {
		const state = makeState({
			past: [],
			present: docPrev,
			future: [docNext],
		});
		const next = RedoCommand.execute(state);

		// docNext（r1, r2）が復元される
		expect(Object.keys(next.objects).sort()).toEqual(["r1", "r2"]);
		expect(next.history.present).toBe(docNext);
		// 進めた present は past へ積まれる
		expect(next.history.past).toEqual([docPrev]);
		expect(next.history.future).toEqual([]);
	});

	it("選択を解除し saveVersion を増分・commitVersion は据え置く", () => {
		const state = makeState({ past: [], present: docPrev, future: [docNext] });
		const next = RedoCommand.execute(state);
		expect(next.selectedIds).toEqual([]);
		expect(next.saveVersion).toBe(1);
		expect(next.commitVersion).toBe(5);
	});

	it("future が空なら state をそのまま返す", () => {
		const state = makeState({ past: [], present: docPrev, future: [] });
		expect(RedoCommand.execute(state)).toBe(state);
	});

	describe("canExecute", () => {
		it("future があれば実行可能", () => {
			expect(
				RedoCommand.canExecute(
					makeState({ past: [], present: docPrev, future: [docNext] }),
				),
			).toBe(true);
		});

		it("future が空なら実行不可", () => {
			expect(
				RedoCommand.canExecute(
					makeState({ past: [], present: docPrev, future: [] }),
				),
			).toBe(false);
		});

		it("ドラッグ中は実行不可", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: docPrev,
						future: [docNext],
						eventStartSnapshot: { foo: 1 },
					}),
				),
			).toBe(false);
		});

		it("テキスト編集中は実行不可", () => {
			expect(
				RedoCommand.canExecute(
					makeState({
						past: [],
						present: docPrev,
						future: [docNext],
						textEditState: { objectId: "r1", text: "" },
					}),
				),
			).toBe(false);
		});
	});
});
