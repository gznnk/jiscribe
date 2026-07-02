import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../cleanupGroups";

// minimal state factory
const makeState = (
	objects: Record<string, ObjectState>,
	rootIds: string[],
): CanvasControllerState =>
	({ objects, rootIds }) as unknown as CanvasControllerState;

const rect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", cx: 0, cy: 0, parentId }) as unknown as ObjectState;

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

describe("cleanupGroups", () => {
	it("no groups -> effectively same reference (no change to objects/rootIds)", () => {
		const r1 = rect("r1");
		const state = makeState({ r1 }, ["r1"]);
		const result = cleanupGroups(state);
		expect(result.objects["r1"]).toBe(r1);
		expect(result.rootIds).toEqual(["r1"]);
	});

	it("a group with 2 or more children -> stays as is", () => {
		const r1 = rect("r1", "g1");
		const r2 = rect("r2", "g1");
		const g1 = group("g1", ["r1", "r2"]);
		const state = makeState({ g1, r1, r2 }, ["g1"]);
		const result = cleanupGroups(state);
		expect(result.objects["g1"]).toBeDefined();
		expect(result.rootIds).toContain("g1");
	});

	describe("empty group (childCount=0)", () => {
		it("an empty group at the root -> is deleted", () => {
			const g1 = group("g1", []);
			const state = makeState({ g1 }, ["g1"]);
			const result = cleanupGroups(state);
			expect(result.objects["g1"]).toBeUndefined();
			expect(result.rootIds).not.toContain("g1");
		});

		it("an empty subgroup inside a parent group -> only the subgroup is deleted, parent remains (rechecked as its child count drops)", () => {
			const r1 = rect("r1", "outer");
			const empty = group("empty", [], "outer");
			const outer = group("outer", ["empty", "r1"]);
			const state = makeState({ outer, empty, r1 }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["empty"]).toBeUndefined();
			// outer is left with just r1, so it gets ungrouped
			expect(result.objects["outer"]).toBeUndefined();
			expect(result.rootIds).toContain("r1");
		});
	});

	describe("a group with 1 child (ungroup)", () => {
		it("a single-child group at the root -> group deleted, child promoted to root", () => {
			const r1 = rect("r1", "g1");
			const g1 = group("g1", ["r1"]);
			const state = makeState({ g1, r1 }, ["g1"]);
			const result = cleanupGroups(state);
			expect(result.objects["g1"]).toBeUndefined();
			expect(result.rootIds).toContain("r1");
			const updatedR1 = result.objects["r1"] as unknown as {
				parentId?: string;
			};
			expect(updatedR1.parentId).toBeUndefined();
		});

		it("a single-child subgroup inside a parent group -> subgroup deleted, child moved to the parent group", () => {
			const r1 = rect("r1", "inner");
			const r2 = rect("r2", "outer");
			const inner = group("inner", ["r1"], "outer");
			const outer = group("outer", ["inner", "r2"]);
			const state = makeState({ outer, inner, r1, r2 }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["inner"]).toBeUndefined();
			const updatedOuter = result.objects["outer"] as unknown as {
				childIds: string[];
			};
			expect(updatedOuter.childIds).toContain("r1");
			expect(updatedOuter.childIds).not.toContain("inner");
			const updatedR1 = result.objects["r1"] as unknown as {
				parentId?: string;
			};
			expect(updatedR1.parentId).toBe("outer");
		});
	});

	describe("nested chain (cases requiring multiple cleanup passes)", () => {
		it("a single-child group containing an empty group -> both are deleted", () => {
			// outer(1 child=inner) -> inner(0 children) -> inner deleted -> outer 0 children -> outer also deleted
			const inner = group("inner", [], "outer");
			const outer = group("outer", ["inner"]);
			const state = makeState({ outer, inner }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["inner"]).toBeUndefined();
			expect(result.objects["outer"]).toBeUndefined();
			expect(result.rootIds).toHaveLength(0);
		});
	});
});
