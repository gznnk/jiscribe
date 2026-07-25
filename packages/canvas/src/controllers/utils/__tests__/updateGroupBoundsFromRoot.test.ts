import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import {
	updateGroupBoundsFromRoot,
	updateGroupBoundsFromRoots,
} from "../updateGroupBoundsFromRoot";

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

describe("updateGroupBoundsFromRoot", () => {
	it("groupId does not exist → returns state as-is without copying objects", () => {
		const state = makeState({});
		const result = updateGroupBoundsFromRoot(state, "missing");
		// the early return kicks in, so no wasteful object copy occurs
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("groupId is not a group → returns state as-is without copying objects", () => {
		const state = makeState({ r1: rect("r1", 0, 0) });
		const result = updateGroupBoundsFromRoot(state, "r1");
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("the topmost ancestor traced upward is not a group → returns state as-is", () => {
		// tracing up from g1 (group, whose parent is rect r1), the root is a rect, so nothing to update
		const g1 = group("g1", [], "r1");
		const r1 = rect("r1", 0, 0);
		const state = makeState({ g1, r1 });
		const result = updateGroupBoundsFromRoot(state, "g1");
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("single group (no parent) → that group's bounds are updated", () => {
		const r1 = rect("r1", 80, 60, "g1");
		const g1 = group("g1", ["r1"]);
		const state = makeState({ g1, r1 });
		const result = updateGroupBoundsFromRoot(state, "g1");
		const updatedG1 = result.objects["g1"] as unknown as {
			cx: number;
			cy: number;
			width: number;
			height: number;
		};
		expect(updatedG1.cx).toBeCloseTo(80);
		expect(updatedG1.cy).toBeCloseTo(60);
		expect(updatedG1.width).toBeCloseTo(20);
		expect(updatedG1.height).toBeCloseTo(20);
	});

	it("nested groups → traces from the root and updates all groups", () => {
		const r1 = rect("r1", 50, 50, "inner");
		const inner = group("inner", ["r1"], "outer");
		const outer = group("outer", ["inner"]);
		const state = makeState({ r1, inner, outer });
		// even passing inner's groupId, since outer is the root, updating starts from outer
		const result = updateGroupBoundsFromRoot(state, "inner");
		const updatedInner = result.objects["inner"] as unknown as {
			cx: number;
			cy: number;
		};
		const updatedOuter = result.objects["outer"] as unknown as {
			cx: number;
			cy: number;
		};
		expect(updatedInner.cx).toBeCloseTo(50);
		expect(updatedOuter.cx).toBeCloseTo(50);
	});

	it("the original state.objects is not mutated (immutable)", () => {
		const r1 = rect("r1", 100, 100, "g1");
		const g1 = group("g1", ["r1"]);
		const originalObjects = { g1, r1 };
		const state = makeState(originalObjects);
		updateGroupBoundsFromRoot(state, "g1");
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0);
	});
});

describe("updateGroupBoundsFromRoots", () => {
	it("no id resolves to a group root → returns state as-is without copying objects", () => {
		const state = makeState({ r1: rect("r1", 0, 0) });
		const result = updateGroupBoundsFromRoots(state, ["missing", "r1"]);
		expect(result).toBe(state);
		expect(result.objects).toBe(state.objects);
	});

	it("multiple independent roots → all subtrees are updated in one call", () => {
		const r1 = rect("r1", 80, 60, "g1");
		const g1 = group("g1", ["r1"]);
		const r2 = rect("r2", 200, 40, "g2");
		const g2 = group("g2", ["r2"]);
		const state = makeState({ g1, r1, g2, r2 });
		const result = updateGroupBoundsFromRoots(state, ["g1", "g2"]);
		const updatedG1 = result.objects["g1"] as unknown as { cx: number };
		const updatedG2 = result.objects["g2"] as unknown as { cx: number };
		expect(updatedG1.cx).toBeCloseTo(80);
		expect(updatedG2.cx).toBeCloseTo(200);
	});

	it("ids resolving to the same root are deduped and the tree still updates", () => {
		const r1 = rect("r1", 50, 50, "inner");
		const inner = group("inner", ["r1"], "outer");
		const outer = group("outer", ["inner"]);
		const state = makeState({ r1, inner, outer });
		const result = updateGroupBoundsFromRoots(state, ["inner", "outer"]);
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
		updateGroupBoundsFromRoots(state, ["g1"]);
		const originalG1 = originalObjects["g1"] as unknown as { cx: number };
		expect(originalG1.cx).toBe(0);
	});
});
