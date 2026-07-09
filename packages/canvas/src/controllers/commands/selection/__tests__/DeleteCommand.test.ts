import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { DeleteCommand } from "../DeleteCommand";

const makeRect = (id: string, parentId?: string): ObjectState =>
	({
		id,
		type: "rect",
		parentId,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makePolyline = (
	id: string,
	points: { x: number; y: number }[],
): PolylineState =>
	({ id, type: "polyline", points }) as unknown as PolylineState;

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
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	selectedVertex?: CanvasControllerState["selectedVertex"];
	selectedConnectorId?: string | null;
}): CanvasControllerState =>
	({
		selectedVertex: null,
		selectedConnectorId: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("DeleteCommand", () => {
	describe("object deletion", () => {
		it("removes selected objects from objects and rootIds and clears the selection", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const next = DeleteCommand.execute(state);
			expect(next.objects["b"]).toBeUndefined();
			expect(next.rootIds).toEqual(["a"]);
			expect(next.selectedIds).toEqual([]);
			expect(next.commitVersion).toBe(1);
		});

		it("recursively deletes descendants when a group is selected", () => {
			const state = makeState({
				selectedIds: ["g"],
				objects: {
					g: makeGroup("g", ["c1", "c2"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
				},
				rootIds: ["g"],
			});
			const next = DeleteCommand.execute(state);
			expect(next.objects["g"]).toBeUndefined();
			expect(next.objects["c1"]).toBeUndefined();
			expect(next.objects["c2"]).toBeUndefined();
			expect(next.rootIds).toEqual([]);
		});

		it("deleting one child in a group removes it from the parent's childIds", () => {
			// 2 children remain, so the group is not dissolved
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
			const next = DeleteCommand.execute(state);
			expect(next.objects["c1"]).toBeUndefined();
			expect((next.objects["g"] as GroupState).childIds).toEqual(["c2", "c3"]);
		});
	});

	describe("vertex deletion", () => {
		it("deletes the specified vertex from a polyline above the minimum vertex count", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 20, y: 0 },
			]);
			const state = makeState({
				selectedIds: ["p"],
				objects: { p: poly },
				rootIds: ["p"],
				selectedVertex: { objectId: "p", vertexIndex: 1 },
			});
			const next = DeleteCommand.execute(state);
			const updated = next.objects["p"] as PolylineState;
			expect(updated.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			]);
			expect(next.selectedVertex).toBeNull();
			// the object itself remains (vertex deletion takes priority)
			expect(next.objects["p"]).toBeDefined();
		});

		it("at the minimum vertex count (2 for a polyline), does not delete a vertex and leaves state unchanged", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			const state = makeState({
				selectedIds: ["p"],
				objects: { p: poly },
				rootIds: ["p"],
				selectedVertex: { objectId: "p", vertexIndex: 1 },
			});
			expect(DeleteCommand.execute(state)).toBe(state);
		});

		it("clears only selectedVertex when the vertex-selection target is not a polyline", () => {
			const state = makeState({
				selectedIds: ["r"],
				objects: { r: makeRect("r") },
				rootIds: ["r"],
				selectedVertex: { objectId: "r", vertexIndex: 0 },
			});
			const next = DeleteCommand.execute(state);
			expect(next.selectedVertex).toBeNull();
			// does not fall through to object deletion
			expect(next.objects["r"]).toBeDefined();
		});
	});

	describe("canExecute", () => {
		it("is executable when there is an object selection", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("is executable when there is a vertex selection", () => {
			const state = makeState({
				selectedIds: [],
				objects: {},
				rootIds: [],
				selectedVertex: { objectId: "p", vertexIndex: 0 },
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("is executable when there is a connector selection", () => {
			const state = makeState({
				selectedIds: [],
				objects: {},
				rootIds: [],
				selectedConnectorId: "c1",
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("is not executable when nothing is selected", () => {
			expect(
				DeleteCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
