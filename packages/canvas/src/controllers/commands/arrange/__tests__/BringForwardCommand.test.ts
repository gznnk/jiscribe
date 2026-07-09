import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { BringForwardCommand } from "../BringForwardCommand";

const registries = createTestRegistries();

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	selectedConnectorId?: string | null;
}): CanvasControllerState =>
	({
		selectedConnectorId: null,
		...params,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

const makeRect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as ObjectState;

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", parentId: undefined, childIds }) as GroupState;

describe("BringForwardCommand", () => {
	describe("selection at the root level", () => {
		it("moves a single selection one step forward (swapping with its neighbor)", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(BringForwardCommand.execute(state, registries).rootIds).toEqual([
				"b",
				"a",
				"c",
			]);
		});

		it("does not move the frontmost element", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(BringForwardCommand.execute(state, registries).rootIds).toEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("advances a contiguous selection block forward as a single unit", () => {
			const state = makeState({
				selectedIds: ["b", "c"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			// the b,c block moves in front of d; adjacent selected items are not swapped
			expect(BringForwardCommand.execute(state, registries).rootIds).toEqual([
				"a",
				"d",
				"b",
				"c",
			]);
		});

		it("increments commitVersion", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(BringForwardCommand.execute(state, registries).commitVersion).toBe(
				1,
			);
		});
	});

	describe("selection within the same group", () => {
		it("moves one step forward within childIds without changing rootIds", () => {
			const state = makeState({
				selectedIds: ["c1"],
				objects: {
					g: makeGroup("g", ["c1", "c2", "c3"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
					c3: makeRect("c3", "g"),
				},
				rootIds: ["g"],
			});
			const next = BringForwardCommand.execute(state, registries);
			expect((next.objects["g"] as GroupState).childIds).toEqual([
				"c2",
				"c1",
				"c3",
			]);
			expect(next.rootIds).toEqual(["g"]);
		});
	});

	describe("canExecute", () => {
		it("is executable when the selection shares the same parent", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(BringForwardCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				BringForwardCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});

		it("is not executable for a mixed selection with different parents", () => {
			const state = makeState({
				selectedIds: ["a", "c1"],
				objects: {
					a: makeRect("a"),
					g: makeGroup("g", ["c1"]),
					c1: makeRect("c1", "g"),
				},
				rootIds: ["a", "g"],
			});
			expect(BringForwardCommand.canExecute(state, registries)).toBe(false);
		});
	});
});
