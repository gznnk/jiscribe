import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createCowObjects } from "../cowObjects";
import { reconcileGroupBounds } from "../reconcileGroupBounds";

const rect = (
	id: string,
	cy: number,
	height: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		cx: 100,
		cy,
		width: 40,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	cy: number,
	height: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "group",
		childIds,
		cx: 100,
		cy,
		width: 40,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

const makeState = (
	objects: Record<string, ObjectState>,
): CanvasControllerState => ({ objects }) as unknown as CanvasControllerState;

/** The cached height of the named group, the field a stale frame shows up in. */
const heightOf = (state: CanvasControllerState, id: string): number =>
	(state.objects[id] as unknown as { height: number }).height;

/** The cached vertical center of the named group. */
const cyOf = (state: CanvasControllerState, id: string): number =>
	(state.objects[id] as unknown as { cy: number }).cy;

describe("reconcileGroupBounds", () => {
	it("the same objects map → returns the same reference", () => {
		const state = makeState({ r1: rect("r1", 100, 20) });
		expect(reconcileGroupBounds(state, state)).toBe(state);
	});

	it("a rewritten object outside any group → returns the same reference", () => {
		const previous = makeState({ r1: rect("r1", 100, 20) });
		const next = makeState({ r1: rect("r1", 100, 60) });
		expect(reconcileGroupBounds(next, previous)).toBe(next);
	});

	it("a box settled by the writer itself → the ancestor frame follows it", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
		});
		// The writer hands over the new box already derived, so no content
		// resizer would have anything left to move.
		const next = makeState({
			...previous.objects,
			r1: rect("r1", 120, 60, "g1"),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(heightOf(result, "g1")).toBe(60);
		expect(result.objects.g1).not.toBe(previous.objects.g1);
	});

	it("a nested group → every frame from the child upward follows", () => {
		const previous = makeState({
			outer: group("outer", ["inner"], 100, 20),
			inner: group("inner", ["r1"], 100, 20, "outer"),
			r1: rect("r1", 100, 20, "inner"),
		});
		const next = makeState({
			...previous.objects,
			r1: rect("r1", 100, 80, "inner"),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(heightOf(result, "inner")).toBe(80);
		expect(heightOf(result, "outer")).toBe(80);
	});

	it("an object untouched by the transition → its group is left alone", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
			r2: rect("r2", 500, 20),
		});
		// Only the ungrouped sibling moved.
		const next = makeState({ ...previous.objects, r2: rect("r2", 500, 90) });

		expect(reconcileGroupBounds(next, previous)).toBe(next);
	});

	it("a copy-on-write view → settles from the overlay alone", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
		});
		const objects = createCowObjects(previous.objects);
		objects.r1 = rect("r1", 100, 70, "g1");
		const next = makeState(objects);

		expect(heightOf(reconcileGroupBounds(next, previous), "g1")).toBe(70);
	});

	it("a child moved out of its group to the root → the group frame shrinks to the rest", () => {
		const previous = makeState({
			g1: group("g1", ["r1", "r2"], 150, 120),
			r1: rect("r1", 100, 20, "g1"),
			r2: rect("r2", 200, 20, "g1"),
		});
		// Only the membership changed: no remaining child's box moved.
		const next = makeState({
			...previous.objects,
			g1: group("g1", ["r1"], 150, 120),
			r2: rect("r2", 200, 20),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(heightOf(result, "g1")).toBe(20);
		expect(cyOf(result, "g1")).toBe(100);
	});

	it("a child removed from a nested group → the inner group settles before the outer", () => {
		const previous = makeState({
			outer: group("outer", ["inner", "r3"], 150, 120),
			inner: group("inner", ["r1", "r2"], 150, 120, "outer"),
			r1: rect("r1", 100, 20, "inner"),
			r2: rect("r2", 200, 20, "inner"),
			r3: rect("r3", 100, 20, "outer"),
		});
		const next = makeState({
			...previous.objects,
			inner: group("inner", ["r1"], 150, 120, "outer"),
			r2: rect("r2", 200, 20),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(heightOf(result, "inner")).toBe(20);
		expect(heightOf(result, "outer")).toBe(20);
		expect(cyOf(result, "outer")).toBe(100);
	});

	it("a root object moved into a group → the group frame grows to take it in", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
			r2: rect("r2", 200, 20),
		});
		const next = makeState({
			...previous.objects,
			g1: group("g1", ["r1", "r2"], 100, 20),
			r2: rect("r2", 200, 20, "g1"),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(heightOf(result, "g1")).toBe(120);
		expect(cyOf(result, "g1")).toBe(150);
	});

	it("a group emptied by the writer → stays in the map with its previous frame", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
		});
		const next = makeState({
			g1: group("g1", [], 100, 20),
			r1: rect("r1", 100, 20),
		});

		const result = reconcileGroupBounds(next, previous);

		expect(result.objects.g1).toBeDefined();
		expect(heightOf(result, "g1")).toBe(20);
		expect(cyOf(result, "g1")).toBe(100);
	});

	it("does not mutate the state it is given", () => {
		const previous = makeState({
			g1: group("g1", ["r1"], 100, 20),
			r1: rect("r1", 100, 20, "g1"),
		});
		const next = makeState({
			...previous.objects,
			r1: rect("r1", 100, 70, "g1"),
		});

		reconcileGroupBounds(next, previous);

		expect(heightOf(next, "g1")).toBe(20);
		expect(heightOf(previous, "g1")).toBe(20);
	});
});
