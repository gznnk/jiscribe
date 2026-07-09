import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { UngroupCommand } from "../UngroupCommand";

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

const makeGroup = (
	id: string,
	childIds: string[],
	parentId?: string,
): GroupState =>
	({
		id,
		type: "group",
		parentId,
		childIds,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as GroupState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
		multiSelectGroup: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("UngroupCommand", () => {
	it("dissolves a root group and promotes its children to the root", () => {
		const state = makeState({
			selectedIds: ["g"],
			objects: {
				g: makeGroup("g", ["a", "b"]),
				a: makeRect("a", 0, 0, "g"),
				b: makeRect("b", 200, 0, "g"),
			},
			rootIds: ["g"],
		});
		const next = UngroupCommand.execute(state);

		// the group is removed
		expect(next.objects["g"]).toBeUndefined();
		// the children are expanded in place of the group within rootIds
		expect(next.rootIds).toEqual(["a", "b"]);
		// the children's parentId is cleared
		expect(next.objects["a"]?.parentId).toBeUndefined();
		expect(next.objects["b"]?.parentId).toBeUndefined();
		// the dissolved children are selected
		expect(next.selectedIds).toEqual(["a", "b"]);
		expect(next.commitVersion).toBe(1);
	});

	it("a nested group is expanded within its parent group's childIds", () => {
		const state = makeState({
			selectedIds: ["inner"],
			objects: {
				outer: makeGroup("outer", ["inner", "c"]),
				inner: makeGroup("inner", ["a", "b"], "outer"),
				a: makeRect("a", 0, 0, "inner"),
				b: makeRect("b", 50, 0, "inner"),
				c: makeRect("c", 200, 0, "outer"),
			},
			rootIds: ["outer"],
		});
		const next = UngroupCommand.execute(state);

		expect(next.objects["inner"]).toBeUndefined();
		// inner is expanded in place within outer.childIds
		expect((next.objects["outer"] as GroupState).childIds).toEqual([
			"a",
			"b",
			"c",
		]);
		// the children have outer as their parent
		expect(next.objects["a"]?.parentId).toBe("outer");
		expect(next.objects["b"]?.parentId).toBe("outer");
		expect(next.rootIds).toEqual(["outer"]);
	});

	describe("canExecute", () => {
		it("is executable when the selection is all groups", () => {
			const state = makeState({
				selectedIds: ["g"],
				objects: { g: makeGroup("g", ["a"]), a: makeRect("a", 0, 0, "g") },
				rootIds: ["g"],
			});
			expect(UngroupCommand.canExecute(state)).toBe(true);
		});

		it("is not executable for a selection containing non-groups", () => {
			const state = makeState({
				selectedIds: ["g", "a"],
				objects: { g: makeGroup("g", []), a: makeRect("a", 0, 0) },
				rootIds: ["g", "a"],
			});
			expect(UngroupCommand.canExecute(state)).toBe(false);
		});

		it("is not executable when there is no selection", () => {
			expect(
				UngroupCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
