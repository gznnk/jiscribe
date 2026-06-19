import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { BringToFrontCommand } from "../BringToFrontCommand";

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({ ...params, commitVersion: 0 }) as unknown as CanvasControllerState;

const makeRect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as ObjectState;

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", parentId: undefined, childIds }) as GroupState;

describe("BringToFrontCommand", () => {
	describe("ルート直下の選択", () => {
		it("単一選択を rootIds の末尾（最前面）へ移動する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			const nextState = BringToFrontCommand.execute(state);
			expect(nextState.rootIds).toEqual(["b", "c", "a"]);
		});

		it("複数選択を選択順ではなく元の z 順を保って末尾へ移動する", () => {
			const state = makeState({
				// 前面側の c → 背面側の a の順で選択
				selectedIds: ["c", "a"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			const nextState = BringToFrontCommand.execute(state);
			// 選択順 [c, a] ではなく rootIds 内の相対順 [a, c] を維持する
			expect(nextState.rootIds).toEqual(["b", "d", "a", "c"]);
		});

		it("非選択オブジェクト同士の順序を変えない", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			const nextState = BringToFrontCommand.execute(state);
			expect(nextState.rootIds).toEqual(["a", "c", "d", "b"]);
		});

		it("commitVersion を増分する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const nextState = BringToFrontCommand.execute(state);
			expect(nextState.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("同一グループ内の選択", () => {
		it("複数選択を元の z 順を保って childIds の末尾へ移動する", () => {
			const state = makeState({
				// 前面側の child3 → 背面側の child1 の順で選択
				selectedIds: ["child3", "child1"],
				objects: {
					group1: makeGroup("group1", ["child1", "child2", "child3"]),
					child1: makeRect("child1", "group1"),
					child2: makeRect("child2", "group1"),
					child3: makeRect("child3", "group1"),
				},
				rootIds: ["group1"],
			});
			const nextState = BringToFrontCommand.execute(state);
			const updatedGroup = nextState.objects["group1"] as GroupState;
			// 選択順 [child3, child1] ではなく childIds 内の相対順 [child1, child3] を維持する
			expect(updatedGroup.childIds).toEqual(["child2", "child1", "child3"]);
			// rootIds は変更しない
			expect(nextState.rootIds).toEqual(["group1"]);
		});
	});
});
