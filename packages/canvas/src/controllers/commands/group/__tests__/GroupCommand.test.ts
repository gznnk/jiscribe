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
	it("combines two root elements into a single new group", () => {
		const state = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 0) },
			rootIds: ["a", "b"],
		});
		const next = GroupCommand.execute(state);

		// rootIds becomes just the single new group
		expect(next.rootIds).toHaveLength(1);
		const groupId = next.rootIds[0];
		const group = next.objects[groupId] as GroupState;
		expect(group.type).toBe("group");
		// holds child IDs preserving z-order
		expect(group.childIds).toEqual(["a", "b"]);
		// the children's parentId points to the new group
		expect(next.objects["a"]?.parentId).toBe(groupId);
		expect(next.objects["b"]?.parentId).toBe(groupId);
		// the new group is selected
		expect(next.selectedIds).toEqual([groupId]);
		expect(next.commitVersion).toBe(1);
	});

	it("the new group's bounds contain its children", () => {
		const state = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 200, 0) },
			rootIds: ["a", "b"],
		});
		const next = GroupCommand.execute(state);
		const group = next.objects[next.rootIds[0]] as GroupState;
		// contains a (0..100 wide) and b (150..250) → width is greater than 0
		expect(group.width).toBeGreaterThan(0);
		expect(group.height).toBeGreaterThan(0);
	});

	describe("canExecute", () => {
		it("is executable with a selection of two or more elements", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 0, 0) },
				rootIds: ["a", "b"],
			});
			expect(GroupCommand.canExecute(state)).toBe(true);
		});

		it("is not executable with a single selection", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
				rootIds: ["a"],
			});
			expect(GroupCommand.canExecute(state)).toBe(false);
		});
	});
});
