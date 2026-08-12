import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createCowObjects, materializeObjects } from "../cowObjects";
import { updateAffectedGroupBounds } from "../updateAffectedGroupBounds";

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
): CanvasControllerState => ({ objects }) as unknown as CanvasControllerState;

describe("updateAffectedGroupBounds", () => {
	it("root-level selection (no parent group) → returns the same reference", () => {
		const objects = { r1: rect("r1", 100, 100) };
		const state = makeState(objects);
		const result = updateAffectedGroupBounds(state, ["r1"]);
		expect(result).toBe(state);
	});

	it("empty selectedIds → returns the same reference", () => {
		const state = makeState({});
		expect(updateAffectedGroupBounds(state, [])).toBe(state);
	});

	it("nonexistent ID → returns the same reference", () => {
		const state = makeState({});
		expect(updateAffectedGroupBounds(state, ["missing"])).toBe(state);
	});

	it("single-level group → the parent group's bounds are updated", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1 });
		const result = updateAffectedGroupBounds(state, ["r1"]);
		const updatedG1 = result.objects["g1"] as unknown as {
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
		expect(updatedG1.cx).toBeCloseTo(100);
		expect(updatedG1.cy).toBeCloseTo(100);
		expect(updatedG1.width).toBeCloseTo(20);
		expect(updatedG1.height).toBeCloseTo(20);
	});

	it("two-level nested group → all ancestors are updated", () => {
		const r1 = rect("r1", 50, 50, "inner");
		const inner = group("inner", ["r1"], "outer");
		const outer = group("outer", ["inner"]);
		const state = makeState({ r1, inner, outer });
		const result = updateAffectedGroupBounds(state, ["r1"]);
		// verify that both inner and outer are updated
		const updatedInner = result.objects["inner"] as unknown as { cx: number };
		const updatedOuter = result.objects["outer"] as unknown as { cx: number };
		expect(updatedInner.cx).toBeCloseTo(50);
		expect(updatedOuter.cx).toBeCloseTo(50);
	});

	it("the original state.objects is not mutated (immutable)", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const originalObjects = { g1, r1 };
		const state = makeState(originalObjects);
		updateAffectedGroupBounds(state, ["r1"]);
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0); // the original value is unchanged
	});

	it("a copy-on-write view is read through and flattened, never mutated", () => {
		// The dragEnd path: the moved object still lives in the view's overlay when
		// the ancestor frames are recomputed.
		const baseObjects = { g1: group("g1", ["r1"]), r1: rect("r1", 0, 0, "g1") };
		const objects = createCowObjects(baseObjects);
		objects.r1 = rect("r1", 100, 100, "g1");
		const result = updateAffectedGroupBounds(makeState(objects), ["r1"]);

		const updatedG1 = result.objects["g1"] as unknown as { cx: number };
		expect(updatedG1.cx).toBeCloseTo(100);
		// Plain, so the group frames are not re-read through the Proxy afterwards
		expect(materializeObjects(result.objects)).toBe(result.objects);
		expect((objects.g1 as unknown as { cx: number }).cx).toBe(0);
	});
});
