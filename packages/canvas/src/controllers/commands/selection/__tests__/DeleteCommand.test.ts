import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
import { DeleteCommand } from "../DeleteCommand";

const registries = createTestRegistries();

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
	parentId?: string,
): PolylineState =>
	({ id, type: "polyline", points, parentId }) as unknown as PolylineState;

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
	objectPartSelection?: CanvasControllerState["objectPartSelection"];
	lastDuplicate?: CanvasControllerState["lastDuplicate"];
}): CanvasControllerState =>
	({
		objectPartSelection: null,
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
			const next = DeleteCommand.execute(state, registries);
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
			const next = DeleteCommand.execute(state, registries);
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
			const next = DeleteCommand.execute(state, registries);
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
				objectPartSelection: vertexPartSelection("p", 1),
			});
			const next = DeleteCommand.execute(state, registries);
			const updated = next.objects["p"] as PolylineState;
			expect(updated.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			]);
			expect(next.objectPartSelection).toBeNull();
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
				objectPartSelection: vertexPartSelection("p", 1),
			});
			expect(DeleteCommand.execute(state, registries)).toBe(state);
		});

		it("ignores a vertex selection on a type with no vertex kind and goes on to the object", () => {
			// A rect has no vertices, so the field names nothing: it is no selection,
			// and the key belongs to the selected objects.
			const state = makeState({
				selectedIds: ["r"],
				objects: { r: makeRect("r") },
				rootIds: ["r"],
				objectPartSelection: vertexPartSelection("r", 0),
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.objectPartSelection).toBeNull();
			expect(next.objects["r"]).toBeUndefined();
			expect(next.selectedIds).toEqual([]);
		});

		it("drops a stale vertex index the same way, with nothing else to delete", () => {
			const polyline = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			const state = makeState({
				selectedIds: [],
				objects: { p: polyline },
				rootIds: ["p"],
				objectPartSelection: vertexPartSelection("p", 7),
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.objectPartSelection).toBeNull();
			expect(next.objects["p"]).toBe(polyline);
		});

		it("commits the edit, forgets the last duplicate, and leaves other objects as they were", () => {
			const other = makeRect("r");
			const state = makeState({
				selectedIds: ["p"],
				objects: {
					p: makePolyline("p", [
						{ x: 0, y: 0 },
						{ x: 10, y: 0 },
						{ x: 20, y: 0 },
					]),
					r: other,
				},
				rootIds: ["p", "r"],
				objectPartSelection: vertexPartSelection("p", 1),
				lastDuplicate: {
					newIds: ["p"],
					cx: 0,
					cy: 0,
					offset: { x: 10, y: 10 },
				},
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.commitVersion).toBe(1);
			// A deletion is not something a duplicate can be offset from any more.
			expect(next.lastDuplicate).toBeNull();
			expect(next.objects["r"]).toBe(other);
		});

		it("propagates the deletion to the bounds of the group the polyline sits in", () => {
			const state = makeState({
				selectedIds: ["p"],
				objects: {
					g: makeGroup("g", ["p"]),
					p: makePolyline(
						"p",
						[
							{ x: 0, y: 0 },
							{ x: 10, y: 10 },
							{ x: 20, y: 20 },
						],
						"g",
					),
				},
				rootIds: ["g"],
				objectPartSelection: vertexPartSelection("p", 2),
			});
			const next = DeleteCommand.execute(state, registries);
			const group = next.objects["g"] as GroupState;
			expect(group.cx).toBe(5);
			expect(group.cy).toBe(5);
			expect(group.width).toBe(10);
			expect(group.height).toBe(10);
		});
	});

	describe("canExecute", () => {
		it("is executable when there is an object selection", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(true);
		});

		it("is executable when there is a vertex selection", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 20, y: 0 },
			]);
			const state = makeState({
				selectedIds: [],
				objects: { p: poly },
				rootIds: ["p"],
				objectPartSelection: vertexPartSelection("p", 0),
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when a vertex field names a type with no vertex kind and nothing else is selected", () => {
			const state = makeState({
				selectedIds: [],
				objects: { r: makeRect("r") },
				rootIds: ["r"],
				objectPartSelection: vertexPartSelection("r", 0),
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(false);
		});

		it("lets the key mean object deletion while the selected vertex's kind registers none", () => {
			// Omitting `delete` is the kind saying Delete is not about its parts, so
			// the object the vertex sits in is what goes.
			const pinRegistries = createTestRegistries();
			pinRegistries.objectPartKind.register("pin", [
				{ kind: "vertex", has: () => true },
			]);
			const pin = { id: "n", type: "pin" } as unknown as ObjectState;
			const state = makeState({
				selectedIds: ["n"],
				objects: { n: pin },
				rootIds: ["n"],
				objectPartSelection: vertexPartSelection("n", 0),
			});

			expect(DeleteCommand.canExecute(state, pinRegistries)).toBe(true);
			const next = DeleteCommand.execute(state, pinRegistries);
			expect(next.objects["n"]).toBeUndefined();
			expect(next.objectPartSelection).toBeNull();
		});

		it("holds the key over a picked part whose kind declares a deletion that refuses", () => {
			// `delete: () => null` is how a kind keeps Delete from reaching the object
			// while one of its parts is picked: executable, yet nothing is removed.
			const pinRegistries = createTestRegistries();
			pinRegistries.objectPartKind.register("pin", [
				{ kind: "vertex", has: () => true, delete: () => null },
			]);
			const pin = { id: "n", type: "pin" } as unknown as ObjectState;
			const state = makeState({
				selectedIds: ["n"],
				objects: { n: pin },
				rootIds: ["n"],
				objectPartSelection: vertexPartSelection("n", 0),
			});

			expect(DeleteCommand.canExecute(state, pinRegistries)).toBe(true);
			expect(DeleteCommand.execute(state, pinRegistries)).toBe(state);
		});

		it("is executable when there is a connector selection", () => {
			const state = makeState({
				objects: {},
				rootIds: [],
				selectedIds: ["c1"],
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when nothing is selected", () => {
			expect(
				DeleteCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});
	});
});
