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
	describe("selection at the root level", () => {
		it("moves a single selection to the end of rootIds (the front)", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			const nextState = BringToFrontCommand.execute(state);
			expect(nextState.rootIds).toEqual(["b", "c", "a"]);
		});

		it("moves a multi-selection to the end preserving original z order, not selection order", () => {
			const state = makeState({
				// selected in order: frontmost c → backmost a
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
			// keeps the relative order within rootIds [a, c], not the selection order [c, a]
			expect(nextState.rootIds).toEqual(["b", "d", "a", "c"]);
		});

		it("does not change the order among unselected objects", () => {
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

		it("increments commitVersion", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const nextState = BringToFrontCommand.execute(state);
			expect(nextState.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("selection within the same group", () => {
		it("moves a multi-selection to the end of childIds preserving original z order", () => {
			const state = makeState({
				// selected in order: frontmost child3 → backmost child1
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
			// keeps the relative order within childIds [child1, child3], not the selection order [child3, child1]
			expect(updatedGroup.childIds).toEqual(["child2", "child1", "child3"]);
			// rootIds is not changed
			expect(nextState.rootIds).toEqual(["group1"]);
		});
	});
});
