import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createCowObjects } from "../cowObjects";
import { updateGroupBoundsForSelection } from "../updateGroupBoundsForSelection";
import { updateGroupBoundsFromRoots } from "../updateGroupBoundsFromRoot";

const rect = (
	id: string,
	cx: number,
	cy: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 20,
		height: 20,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const makeState = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("updateGroupBoundsForSelection", () => {
	it("returns the state itself when nothing selected lives in a group", () => {
		const state = makeState({ r1: rect("r1", 0, 0) }, ["r1"]);

		const result = updateGroupBoundsForSelection(state);

		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("returns the state itself when the selection names nothing", () => {
		const state = makeState({ r1: rect("r1", 0, 0) }, ["gone"]);

		expect(updateGroupBoundsForSelection(state)).toBe(state);
	});

	it("settles the whole subtree above every selected id", () => {
		// Two roots, and an id under each — so a per-id walk and one batch walk
		// have to agree about both.
		const state = makeState(
			{
				gA: group("gA", ["gA1"]),
				gA1: group("gA1", ["r1"], "gA"),
				r1: rect("r1", 100, 100, "gA1"),
				gB: group("gB", ["r2"]),
				r2: rect("r2", -50, -50, "gB"),
			},
			["r1", "r2"],
		);

		const result = updateGroupBoundsForSelection(state);

		expect(result.objects.gA1).toMatchObject({ cx: 100, cy: 100 });
		expect(result.objects.gA).toMatchObject({ cx: 100, cy: 100 });
		expect(result.objects.gB).toMatchObject({ cx: -50, cy: -50 });
	});

	it("leaves the same bounds as the batch call over the same ids", () => {
		const objects = {
			g1: group("g1", ["g2", "r3"]),
			g2: group("g2", ["r1", "r2"], "g1"),
			r1: rect("r1", 0, 0, "g2"),
			r2: rect("r2", 40, 0, "g2"),
			r3: rect("r3", 0, 60, "g1"),
		};

		expect(
			updateGroupBoundsForSelection(makeState(objects, ["r1", "r2", "r3"]))
				.objects,
		).toEqual(
			updateGroupBoundsFromRoots(makeState(objects, []), ["r1", "r2", "r3"])
				.objects,
		);
	});

	it("reads a copy-on-write view without leaving one behind", () => {
		// The transform drag and the sidebar's numeric input both arrive with the
		// map still a view, so the overlay has to be seen and the result has to be
		// plain (issue #160).
		const base = { g1: group("g1", ["r1"]), r1: rect("r1", 0, 0, "g1") };
		const view = createCowObjects(base);
		view.r1 = rect("r1", 200, 0, "g1");

		const result = updateGroupBoundsForSelection(makeState(view, ["r1"]));

		expect(result.objects.g1).toMatchObject({ cx: 200, cy: 0 });
		// The base is untouched, so the view's own reads still answer as before.
		expect(base.g1).toMatchObject({ cx: 0, cy: 0 });
	});
});
