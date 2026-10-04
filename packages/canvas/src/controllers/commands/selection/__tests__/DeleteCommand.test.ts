import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
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
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	rootIds: string[];
	lastDuplicate?: CanvasControllerState["lastDuplicate"];
}): CanvasControllerState =>
	({
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("DeleteCommand", () => {
	describe("object deletion", () => {
		it("removes selected objects from objects and rootIds and clears the selection", () => {
			const state = makeState({
				selection: selectionOf(["b"]),
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.objects["b"]).toBeUndefined();
			expect(next.rootIds).toEqual(["a"]);
			expect(next.selection.objectIds).toEqual([]);
			expect(next.commitVersion).toBe(1);
		});

		it("recursively deletes descendants when a group is selected", () => {
			const state = makeState({
				selection: selectionOf(["g"]),
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
				selection: selectionOf(["c1"]),
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
				selection: selectionOf(["p"], vertexPartSelection(1)),
				objects: { p: poly },
				rootIds: ["p"],
			});
			const next = DeleteCommand.execute(state, registries);
			const updated = next.objects["p"] as PolylineState;
			expect(updated.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			]);
			expect(next.selection.part).toBeNull();
			// the object itself remains (vertex deletion takes priority)
			expect(next.objects["p"]).toBeDefined();
		});

		it("at the minimum vertex count (2 for a polyline), does not delete a vertex and leaves state unchanged", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			const state = makeState({
				selection: selectionOf(["p"], vertexPartSelection(1)),
				objects: { p: poly },
				rootIds: ["p"],
			});
			expect(DeleteCommand.execute(state, registries)).toBe(state);
		});

		it("ignores a vertex selection on a type with no vertex kind and goes on to the object", () => {
			// A rect has no vertices, so the field names nothing: it is no selection,
			// and the key belongs to the selected objects.
			const state = makeState({
				selection: selectionOf(["r"], vertexPartSelection(0)),
				objects: { r: makeRect("r") },
				rootIds: ["r"],
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.selection.part).toBeNull();
			expect(next.objects["r"]).toBeUndefined();
			expect(next.selection.objectIds).toEqual([]);
		});

		it("lets a stale vertex index fall through to the object the key then takes", () => {
			const polyline = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			const state = makeState({
				selection: selectionOf(["p"], vertexPartSelection(7)),
				objects: { p: polyline },
				rootIds: ["p"],
			});
			const next = DeleteCommand.execute(state, registries);
			expect(next.selection.part).toBeNull();
			expect(next.objects["p"]).toBeUndefined();
		});

		it("commits the edit, forgets the last duplicate, and leaves other objects as they were", () => {
			const other = makeRect("r");
			const state = makeState({
				selection: selectionOf(["p"], vertexPartSelection(1)),
				objects: {
					p: makePolyline("p", [
						{ x: 0, y: 0 },
						{ x: 10, y: 0 },
						{ x: 20, y: 0 },
					]),
					r: other,
				},
				rootIds: ["p", "r"],
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
				selection: selectionOf(["p"], vertexPartSelection(2)),
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
			});
			const next = DeleteCommand.execute(state, registries);
			const group = next.objects["g"] as GroupState;
			expect(group.cx).toBe(5);
			expect(group.cy).toBe(5);
			expect(group.width).toBe(10);
			expect(group.height).toBe(10);
		});
	});

	describe("part-selection deletion", () => {
		/** A shape carrying a list of parts addressed by their index, as a table's tracks are. */
		type TrackState = ObjectState & { items: string[] };

		const makeTracked = (items: string[]): TrackState =>
			({ id: "n", type: "pin", items }) as unknown as TrackState;

		/** Registers the `track` kind on the `pin` type, optionally without a deletion. */
		const trackedRegistries = (
			remove?: (
				object: TrackState,
				partIds: readonly string[],
			) => TrackState | null,
		) => {
			const bundle = createTestRegistries();
			bundle.objectPartKind.register<TrackState>("pin", [
				{
					kind: "track",
					has: (object, partId) => Number(partId) < object.items.length,
					delete: remove,
				},
			]);
			return bundle;
		};

		const trackedState = (
			items: string[],
			partIds: string[],
		): CanvasControllerState =>
			makeState({
				selection: selectionOf(["n"], {
					kind: "track",
					ranges: partIds.map((partId) => ({
						anchorId: partId,
						focusId: partId,
					})),
				}),
				objects: { n: makeTracked(items) },
				rootIds: ["n"],
			});

		const removeTracks = (
			object: TrackState,
			partIds: readonly string[],
		): TrackState => {
			const removed = new Set(partIds.map(Number));
			return {
				...object,
				items: object.items.filter((_, index) => !removed.has(index)),
			};
		};

		it("removes the parts the channel names and blanks the channel", () => {
			const bundle = trackedRegistries(removeTracks);
			const state = trackedState(["a", "b", "c"], ["1"]);

			const next = DeleteCommand.execute(state, bundle);

			expect((next.objects["n"] as TrackState).items).toEqual(["a", "c"]);
			expect(next.selection.part).toBeNull();
			expect(next.commitVersion).toBe(1);
			expect(DeleteCommand.canExecute(state, bundle)).toBe(true);
		});

		it("lets the key reach the object while the picked kind registers no deletion", () => {
			// This is what keeps Delete over a text slot deleting the shape the slot
			// belongs to.
			const state = trackedState(["a", "b"], ["0"]);

			const next = DeleteCommand.execute(state, trackedRegistries());

			expect(next.objects["n"]).toBeUndefined();
			expect(next.selection.objectIds).toEqual([]);
		});

		it("holds the key over a picked part whose kind declares a deletion that refuses", () => {
			const bundle = trackedRegistries(() => null);
			const state = trackedState(["a", "b"], ["0"]);

			expect(DeleteCommand.canExecute(state, bundle)).toBe(true);
			expect(DeleteCommand.execute(state, bundle)).toBe(state);
		});

		it("ignores ids the object has outgrown and goes on to the object", () => {
			const state = trackedState(["a", "b"], ["7"]);

			const next = DeleteCommand.execute(
				state,
				trackedRegistries(removeTracks),
			);

			expect(next.objects["n"]).toBeUndefined();
		});

		it("removes every vertex the picked ranges cover, and blanks the pick", () => {
			const bundle = createTestRegistries();
			const state = makeState({
				selection: selectionOf(["p"], {
					kind: "vertex",
					ranges: [
						{ anchorId: "0", focusId: "0" },
						{ anchorId: "2", focusId: "2" },
					],
				}),
				objects: {
					p: makePolyline("p", [
						{ x: 0, y: 0 },
						{ x: 10, y: 0 },
						{ x: 20, y: 0 },
						{ x: 30, y: 0 },
					]),
				},
				rootIds: ["p"],
			});

			const next = DeleteCommand.execute(state, bundle);

			expect((next.objects["p"] as PolylineState).points).toEqual([
				{ x: 10, y: 0 },
				{ x: 30, y: 0 },
			]);
			expect(next.selection.part).toBeNull();
		});
	});

	describe("canExecute", () => {
		it("is executable when there is an object selection", () => {
			const state = makeState({
				selection: selectionOf(["a"]),
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
				selection: selectionOf(["p"], vertexPartSelection(0)),
				objects: { p: poly },
				rootIds: ["p"],
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(true);
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
				selection: selectionOf(["n"], vertexPartSelection(0)),
				objects: { n: pin },
				rootIds: ["n"],
			});

			expect(DeleteCommand.canExecute(state, pinRegistries)).toBe(true);
			const next = DeleteCommand.execute(state, pinRegistries);
			expect(next.objects["n"]).toBeUndefined();
			expect(next.selection.part).toBeNull();
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
				selection: selectionOf(["n"], vertexPartSelection(0)),
				objects: { n: pin },
				rootIds: ["n"],
			});

			expect(DeleteCommand.canExecute(state, pinRegistries)).toBe(true);
			expect(DeleteCommand.execute(state, pinRegistries)).toBe(state);
		});

		it("is executable when there is a connector selection", () => {
			const state = makeState({
				objects: {},
				rootIds: [],
				selection: selectionOf(["c1"]),
			});
			expect(DeleteCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when nothing is selected", () => {
			expect(
				DeleteCommand.canExecute(
					makeState({ selection: selectionOf([]), objects: {}, rootIds: [] }),
					registries,
				),
			).toBe(false);
		});
	});
});
