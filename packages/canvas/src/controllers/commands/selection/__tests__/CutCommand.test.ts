import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { CutCommand } from "../CutCommand";

beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
		selectedVertex: null,
		selectedConnectorId: null,
		multiSelectGroup: null,
		internalClipboard: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("CutCommand", () => {
	it("選択をクリップボードへ退避してから削除する（コピー + 削除の合成）", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a"), b: makeRect("b") },
			rootIds: ["a", "b"],
		});
		const next = CutCommand.execute(state);

		// コピー: クリップボードに退避
		expect(next.internalClipboard?.rootIds).toEqual(["a"]);
		expect(next.internalClipboard?.objects["a"]).toBeDefined();

		// 削除: キャンバスからは消える
		expect(next.objects["a"]).toBeUndefined();
		expect(next.rootIds).toEqual(["b"]);
		expect(next.selectedIds).toEqual([]);
	});

	describe("canExecute", () => {
		it("選択があれば実行可能", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(CutCommand.canExecute(state)).toBe(true);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				CutCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
