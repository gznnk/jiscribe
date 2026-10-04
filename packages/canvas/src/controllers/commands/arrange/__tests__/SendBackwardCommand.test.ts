import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { SendBackwardCommand } from "../SendBackwardCommand";

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

describe("SendBackwardCommand", () => {
	describe("selection at the root level", () => {
		it("moves a single selection one step back (swapping with its neighbor)", () => {
			const state = makeState({
				selection: selectionOf(["c"]),
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(SendBackwardCommand.execute(state, registries).rootIds).toEqual([
				"a",
				"c",
				"b",
			]);
		});

		it("does not move the backmost element", () => {
			const state = makeState({
				selection: selectionOf(["a"]),
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(SendBackwardCommand.execute(state, registries).rootIds).toEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("moves a contiguous selection block back as a single unit", () => {
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
			expect(SendBackwardCommand.execute(state, registries).rootIds).toEqual([
				"b",
				"c",
				"a",
				"d",
			]);
		});

		it("increments commitVersion", () => {
			const state = makeState({
				selection: selectionOf(["b"]),
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(SendBackwardCommand.execute(state, registries).commitVersion).toBe(
				1,
			);
		});
	});

	describe("selection within the same group", () => {
		it("moves one step back within childIds without changing rootIds", () => {
			const state = makeState({
				selection: selectionOf(["c3"]),
				objects: {
					g: makeGroup("g", ["c1", "c2", "c3"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
					c3: makeRect("c3", "g"),
				},
				rootIds: ["g"],
			});
			const next = SendBackwardCommand.execute(state, registries);
			expect((next.objects["g"] as GroupState).childIds).toEqual([
				"c1",
				"c3",
				"c2",
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
			expect(SendBackwardCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when there is no selection", () => {
			expect(
				SendBackwardCommand.canExecute(
					makeState({ selection: selectionOf([]), objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});
	});
});
