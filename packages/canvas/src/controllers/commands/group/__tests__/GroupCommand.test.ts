import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { GroupCommand } from "../GroupCommand";

beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (
	id: string,
	cx: number,
	cy: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		parentId,
		cx,
		cy,
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
	multiSelectGroup?: GroupState | null;
}): CanvasControllerState =>
	({
		multiSelectGroup: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("GroupCommand", () => {
	it("ルートの 2 要素を 1 つの新グループへまとめる", () => {
		const state = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 0) },
			rootIds: ["a", "b"],
		});
		const next = GroupCommand.execute(state);

		// rootIds は新グループ 1 つだけになる
		expect(next.rootIds).toHaveLength(1);
		const groupId = next.rootIds[0];
		const group = next.objects[groupId] as GroupState;
		expect(group.type).toBe("group");
		// z-order を保った子 ID を持つ
		expect(group.childIds).toEqual(["a", "b"]);
		// 子の parentId が新グループを指す
		expect(next.objects["a"]?.parentId).toBe(groupId);
		expect(next.objects["b"]?.parentId).toBe(groupId);
		// 新グループが選択される
		expect(next.selectedIds).toEqual([groupId]);
		expect(next.commitVersion).toBe(1);
	});

	it("新グループのバウンドが子を内包する", () => {
		const state = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 0) },
			rootIds: ["a", "b"],
		});
		const next = GroupCommand.execute(state);
		const group = next.objects[next.rootIds[0]] as GroupState;
		// a(0..100幅) と b(150..250) を含む → 幅は 0 より大きい
		expect(group.width).toBeGreaterThan(0);
		expect(group.height).toBeGreaterThan(0);
	});

	describe("canExecute", () => {
		it("2 要素以上の選択で実行可能", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 0, 0) },
				rootIds: ["a", "b"],
			});
			expect(GroupCommand.canExecute(state)).toBe(true);
		});

		it("単一選択では実行不可", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
				rootIds: ["a"],
			});
			expect(GroupCommand.canExecute(state)).toBe(false);
		});
	});
});
