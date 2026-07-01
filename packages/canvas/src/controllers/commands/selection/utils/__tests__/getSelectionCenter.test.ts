import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { getSelectionCenter } from "../getSelectionCenter";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeGroup = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "group",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		childIds: [],
	}) as unknown as GroupState as ObjectState;

const makePoly = (
	id: string,
	points: { x: number; y: number }[],
): ObjectState =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

const makeState = (
	params: Partial<CanvasControllerState> & {
		selectedIds: string[];
		objects: Record<string, ObjectState>;
	},
): CanvasControllerState =>
	({
		multiSelectGroup: null,
		lastDuplicate: null,
		...params,
	}) as unknown as CanvasControllerState;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getSelectionCenter", () => {
	it("empty ids → null", () => {
		const state = makeState({ selectedIds: [], objects: {} });
		expect(getSelectionCenter(state, [])).toBeNull();
	});

	it("multi-selection + multiSelectGroup → the group's cx/cy", () => {
		const state = makeState({
			selectedIds: ["r1", "r2"],
			objects: {},
			multiSelectGroup: { cx: 50, cy: 60 } as unknown as GroupState,
		});
		expect(getSelectionCenter(state, ["r1", "r2"])).toEqual({
			cx: 50,
			cy: 60,
		});
	});

	it("multi-selection but multiSelectGroup is null → null", () => {
		const state = makeState({ selectedIds: ["r1", "r2"], objects: {} });
		expect(getSelectionCenter(state, ["r1", "r2"])).toBeNull();
	});

	it("single group → cx/cy", () => {
		const g = makeGroup("g1", 10, 20);
		const state = makeState({ selectedIds: ["g1"], objects: { g1: g } });
		expect(getSelectionCenter(state, ["g1"])).toEqual({ cx: 10, cy: 20 });
	});

	it("single rect (TransformedFrame) → cx/cy", () => {
		const r = makeRect("r1", 30, 40);
		const state = makeState({ selectedIds: ["r1"], objects: { r1: r } });
		expect(getSelectionCenter(state, ["r1"])).toEqual({ cx: 30, cy: 40 });
	});

	it("single poly → bounding box center", () => {
		const p = makePoly("p1", [
			{ x: 0, y: 0 },
			{ x: 100, y: 200 },
		]);
		const state = makeState({ selectedIds: ["p1"], objects: { p1: p } });
		expect(getSelectionCenter(state, ["p1"])).toEqual({ cx: 50, cy: 100 });
	});

	it("object does not exist → null", () => {
		const state = makeState({ selectedIds: ["x"], objects: {} });
		expect(getSelectionCenter(state, ["x"])).toBeNull();
	});
});
