import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { getSelectedFrameValues } from "../getSelectedFrameValues";

const rect = (id: string, extra: Record<string, unknown> = {}): ObjectState =>
	({
		id,
		type: "rect",
		cx: 5,
		cy: 5,
		width: 10,
		height: 10,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...extra,
	}) as unknown as ObjectState;

/** A group carries its own computed bounding frame (GroupCommand), rotation 0 included. */
const group = (id: string, extra: Record<string, unknown> = {}): GroupState =>
	({
		id,
		type: "group",
		childIds: [],
		cx: 5,
		cy: 5,
		width: 10,
		height: 10,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...extra,
	}) as unknown as GroupState;

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selection: selectionOf([]),
		multiSelectGroup: null,
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("getSelectedFrameValues", () => {
	it("nothing selected → null", () => {
		expect(getSelectedFrameValues(makeState({}))).toBeNull();
	});

	it("a connector selection has no frame", () => {
		// A connector's geometry is its waypoints: no cx / cy / width / height and no
		// transform, which is what isTransformedFrame refuses it on.
		const state = makeState({
			selection: selectionOf(["c"]),
			objects: {
				c: {
					id: "c",
					type: "connector",
					points: [{ x: 50, y: 50 }],
				} as unknown as ObjectState,
			},
		});
		expect(getSelectedFrameValues(state)).toBeNull();
	});

	it("a selected object whose type carries no frame → null", () => {
		const state = makeState({
			selection: selectionOf(["a"]),
			objects: { a: { id: "a", type: "connector" } as unknown as ObjectState },
		});
		expect(getSelectedFrameValues(state)).toBeNull();
	});

	it("a single unrotated rect: top-left, size and angle", () => {
		const state = makeState({
			selection: selectionOf(["a"]),
			objects: { a: rect("a") },
		});
		expect(getSelectedFrameValues(state)).toEqual({
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			rotation: 0,
		});
	});

	it("a rotated rect: x/y name the rotated corner, not the bounding box", () => {
		const state = makeState({
			selection: selectionOf(["a"]),
			objects: {
				a: rect("a", { width: 10, height: 4, rotation: 90 }),
			},
		});
		const values = getSelectedFrameValues(state);
		// cx=5, cy=5, halfWidth=5, halfHeight=2: a 90° turn swings the top-left
		// corner to (cx + halfHeight, cy - halfWidth).
		expect(values?.x).toBeCloseTo(7, 9);
		expect(values?.y).toBeCloseTo(0, 9);
		expect(values).toMatchObject({ width: 10, height: 4, rotation: 90 });
	});

	it("a multi-selection reads the multiSelectGroup's frame, not the individual objects", () => {
		const state = makeState({
			selection: selectionOf(["a", "b"]),
			objects: {
				a: rect("a", { cx: 5, cy: 5 }),
				b: rect("b", { cx: 105, cy: 105 }),
			},
			multiSelectGroup: group("multi", {
				cx: 55,
				cy: 55,
				width: 110,
				height: 110,
			}),
		});
		expect(getSelectedFrameValues(state)).toEqual({
			x: 0,
			y: 0,
			width: 110,
			height: 110,
			rotation: 0,
		});
	});

	it("a group selected on its own reads its own bounding frame", () => {
		const state = makeState({
			selection: selectionOf(["g"]),
			objects: {
				g: group("g", { cx: 55, cy: 55, width: 110, height: 110 }),
			},
		});
		expect(getSelectedFrameValues(state)).toEqual({
			x: 0,
			y: 0,
			width: 110,
			height: 110,
			rotation: 0,
		});
	});
});
