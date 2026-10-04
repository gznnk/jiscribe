import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { BringForwardCommand } from "../BringForwardCommand";

const registries = createTestRegistries();

const makeState = (params: {
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	rootIds: string[];
}): CanvasControllerState =>
	({
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
				selection: selectionOf(["a"]),
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
				selection: selectionOf(["c"]),
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
				selection: selectionOf(["b", "c"]),
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
				selection: selectionOf(["a"]),
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
				selection: selectionOf(["c1"]),
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
				selection: selectionOf(["a", "b"]),
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(BringForwardCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				BringForwardCommand.canExecute(
					makeState({ selection: selectionOf([]), objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});

		it("is not executable for a mixed selection with different parents", () => {
			const state = makeState({
				selection: selectionOf(["a", "c1"]),
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
