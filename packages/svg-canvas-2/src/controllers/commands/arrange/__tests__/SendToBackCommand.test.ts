import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { SendToBackCommand } from "../SendToBackCommand";

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

describe("SendToBackCommand", () => {
	describe("ルート直下の選択", () => {
		it("単一選択を rootIds の先頭（最背面）へ移動する", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			const nextState = SendToBackCommand.execute(state);
			expect(nextState.rootIds).toEqual(["c", "a", "b"]);
		});

		it("複数選択を選択順ではなく元の z 順を保って先頭へ移動する", () => {
			const state = makeState({
				// 前面側の d → 背面側の b の順で選択
				selectedIds: ["d", "b"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			const nextState = SendToBackCommand.execute(state);
			// 選択順 [d, b] ではなく rootIds 内の相対順 [b, d] を維持する
			expect(nextState.rootIds).toEqual(["b", "d", "a", "c"]);
		});

		it("非選択オブジェクト同士の順序を変えない", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			const nextState = SendToBackCommand.execute(state);
			expect(nextState.rootIds).toEqual(["c", "a", "b", "d"]);
		});

		it("commitVersion を増分する", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const nextState = SendToBackCommand.execute(state);
			expect(nextState.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("同一グループ内の選択", () => {
		it("複数選択を元の z 順を保って childIds の先頭へ移動する", () => {
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
			const nextState = SendToBackCommand.execute(state);
			const updatedGroup = nextState.objects["group1"] as GroupState;
			// 選択順 [child3, child1] ではなく childIds 内の相対順 [child1, child3] を維持する
			expect(updatedGroup.childIds).toEqual(["child1", "child3", "child2"]);
			// rootIds は変更しない
			expect(nextState.rootIds).toEqual(["group1"]);
		});
	});
});
