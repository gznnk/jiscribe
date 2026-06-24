import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { SelectAllCommand } from "../SelectAllCommand";

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

const makeState = (params: {
	rootIds: string[];
	objects: Record<string, ObjectState>;
}): CanvasControllerState =>
	({
		rootIds: params.rootIds,
		objects: params.objects,
		selectedIds: [],
		selectedConnectorId: "stale",
		selectedVertex: { objectId: "x", vertexIndex: 0 },
		multiSelectGroup: null,
		objectMenuOpenId: "x",
	}) as unknown as CanvasControllerState;

describe("SelectAllCommand", () => {
	it("rootIds 全体を選択する", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		const next = SelectAllCommand.execute(state);
		expect(next.selectedIds).toEqual(["a", "b"]);
	});

	it("複数選択時は multiSelectGroup を生成する", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		expect(SelectAllCommand.execute(state).multiSelectGroup).not.toBeNull();
	});

	it("コネクター選択・頂点選択を排他的にクリアする", () => {
		const state = makeState({
			rootIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 200) },
		});
		const next = SelectAllCommand.execute(state);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
	});

	describe("canExecute", () => {
		it("ルートにオブジェクトがあれば実行可能", () => {
			const state = makeState({
				rootIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			expect(SelectAllCommand.canExecute(state)).toBe(true);
		});

		it("空キャンバスでは実行不可", () => {
			expect(
				SelectAllCommand.canExecute(makeState({ rootIds: [], objects: {} })),
			).toBe(false);
		});
	});
});
