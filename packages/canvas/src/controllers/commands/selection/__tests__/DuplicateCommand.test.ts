import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { DuplicateCommand } from "../DuplicateCommand";

const registries = createTestRegistries();

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

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({
		id,
		type: "group",
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
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
		registries,
		multiSelectGroup: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("DuplicateCommand", () => {
	it("duplicates a root selection at the default offset (+20,+20) and stacks it in front", () => {
		const state = makeState({
			selection: selectionOf(["a"]),
			objects: { a: makeRect("a", 100, 100) },
			rootIds: ["a"],
		});
		const next = DuplicateCommand.execute(state, registries);

		expect(Object.keys(next.objects)).toHaveLength(2);
		expect(next.rootIds).toHaveLength(2);
		// the original a remains, and the new ID is at the end (frontmost)
		expect(next.rootIds[0]).toBe("a");
		const newId = next.rootIds[1];
		expect(newId).not.toBe("a");

		const cloned = next.objects[newId] as unknown as { cx: number; cy: number };
		expect(cloned.cx).toBe(120);
		expect(cloned.cy).toBe(120);
	});

	it("selects the duplicate and records lastDuplicate", () => {
		const state = makeState({
			selection: selectionOf(["a"]),
			objects: { a: makeRect("a", 100, 100) },
			rootIds: ["a"],
		});
		const next = DuplicateCommand.execute(state, registries);
		expect(next.selection.objectIds).toEqual([next.rootIds[1]]);
		expect(next.lastDuplicate?.newIds).toEqual(next.selection.objectIds);
		expect(next.lastDuplicate?.offset).toEqual({ x: 20, y: 20 });
		expect(next.commitVersion).toBe(1);
	});

	it("duplicates an in-group selection within the same parent group", () => {
		const state = makeState({
			selection: selectionOf(["c1"]),
			objects: {
				g: makeGroup("g", ["c1", "c2"]),
				c1: makeRect("c1", 50, 50, "g"),
				c2: makeRect("c2", 80, 80, "g"),
			},
			rootIds: ["g"],
		});
		const next = DuplicateCommand.execute(state, registries);
		const newId = next.selection.objectIds[0];
		// the new object's parent is group g
		expect(next.objects[newId]?.parentId).toBe("g");
		// it is added to the parent group's childIds
		expect((next.objects["g"] as GroupState).childIds).toContain(newId);
		// rootIds stays as g (in-group duplication is not promoted to the top level)
		expect(next.rootIds).toEqual(["g"]);
	});

	describe("canExecute", () => {
		it("is executable when there is a selection", () => {
			const state = makeState({
				selection: selectionOf(["a"]),
				objects: { a: makeRect("a", 0, 0) },
				rootIds: ["a"],
			});
			expect(DuplicateCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				DuplicateCommand.canExecute(
					makeState({ selection: selectionOf([]), objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});
	});
});
