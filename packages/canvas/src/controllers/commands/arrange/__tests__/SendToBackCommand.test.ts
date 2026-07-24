import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { SendToBackCommand } from "../SendToBackCommand";

const registries = createTestRegistries();

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
	describe("selection at the root level", () => {
		it("moves a single selection to the start of rootIds (the back)", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			const nextState = SendToBackCommand.execute(state, registries);
			expect(nextState.rootIds).toEqual(["c", "a", "b"]);
		});

		it("moves a multi-selection to the start preserving original z order, not selection order", () => {
			const state = makeState({
				// selected in order: frontmost d → backmost b
				selectedIds: ["d", "b"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			const nextState = SendToBackCommand.execute(state, registries);
			// keeps the relative order within rootIds [b, d], not the selection order [d, b]
			expect(nextState.rootIds).toEqual(["b", "d", "a", "c"]);
		});

		it("does not change the order among unselected objects", () => {
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
			const nextState = SendToBackCommand.execute(state, registries);
			expect(nextState.rootIds).toEqual(["c", "a", "b", "d"]);
		});

		it("increments commitVersion", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const nextState = SendToBackCommand.execute(state, registries);
			expect(nextState.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("selection within the same group", () => {
		it("moves a multi-selection to the start of childIds preserving original z order", () => {
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
			const nextState = SendToBackCommand.execute(state, registries);
			const updatedGroup = nextState.objects["group1"] as GroupState;
			// keeps the relative order within childIds [child1, child3], not the selection order [child3, child1]
			expect(updatedGroup.childIds).toEqual(["child1", "child3", "child2"]);
			// rootIds is not changed
			expect(nextState.rootIds).toEqual(["group1"]);
		});
	});
});
