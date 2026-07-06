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

	describe("zero-size prevention (GroupState invariant, issue #35)", () => {
		const makePolyline = (
			id: string,
			points: { x: number; y: number }[],
		): ObjectState =>
			({
				id,
				type: "polyline",
				points,
			}) as unknown as ObjectState;

		it("clamps a degenerate axis when grouping collinear children", () => {
			// two horizontal polylines on the same y → the OBB's height would be 0
			const state = makeState({
				selectedIds: ["p1", "p2"],
				objects: {
					p1: makePolyline("p1", [
						{ x: 0, y: 50 },
						{ x: 40, y: 50 },
					]),
					p2: makePolyline("p2", [
						{ x: 60, y: 50 },
						{ x: 100, y: 50 },
					]),
				},
				rootIds: ["p1", "p2"],
			});
			const next = GroupCommand.execute(state);
			const group = next.objects[next.rootIds[0]] as GroupState;
			expect(group.type).toBe("group");
			expect(group.width).toBeGreaterThan(0);
			expect(group.height).toBeGreaterThan(0);
		});

		it("does not create a group when no child contributes geometry", () => {
			// objects with neither a frame nor points yield null bounds → abort
			const noGeometry = (id: string): ObjectState =>
				({ id, type: "mystery" }) as unknown as ObjectState;
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: noGeometry("a"), b: noGeometry("b") },
				rootIds: ["a", "b"],
			});
			const next = GroupCommand.execute(state);
			expect(next).toBe(state);
		});
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
