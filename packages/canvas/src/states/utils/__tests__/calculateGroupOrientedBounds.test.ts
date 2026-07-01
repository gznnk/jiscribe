import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../objects/base/ObjectState";
import { calculateGroupOrientedBounds } from "../calculateGroupOrientedBounds";

/**
 * Helpers that build objects with only the minimal fields needed for testing.
 * calculateGroupOrientedBounds only references type / childIds and the
 * geometry fields of Frame and Poly, so everything else is omitted.
 */
const makeObjects = (
	entries: Record<string, Partial<ObjectState> & { type: string }>,
): Record<string, ObjectState> =>
	entries as unknown as Record<string, ObjectState>;

const makeGroup = (
	childIds: string[],
	transform?: { rotation?: number; scaleX?: number; scaleY?: number },
) =>
	({
		id: "g",
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		...transform,
	}) as unknown as ObjectState;

const makeFrame = (
	id: string,
	frame: {
		cx: number;
		cy: number;
		width: number;
		height: number;
		rotation?: number;
		scaleX?: number;
		scaleY?: number;
	},
) =>
	({
		id,
		type: "rect",
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...frame,
	}) as unknown as ObjectState;

const makePoly = (id: string, points: { x: number; y: number }[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

describe("calculateGroupOrientedBounds", () => {
	it("returns null when the group does not exist", () => {
		const result = calculateGroupOrientedBounds(makeObjects({}), "missing");
		expect(result).toBeNull();
	});

	it("returns null when the target object is not of group type", () => {
		const objects = makeObjects({
			r1: { id: "r1", type: "rect" },
		});
		expect(calculateGroupOrientedBounds(objects, "r1")).toBeNull();
	});

	it("returns null when there are no children", () => {
		const objects = {
			g: makeGroup([]),
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("returns null when all child IDs are nonexistent", () => {
		const objects = {
			g: makeGroup(["ghost1", "ghost2"]),
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("returns null when only children without geometry are present", () => {
		const objects = {
			g: makeGroup(["c1"]),
			// a child that is neither frame nor poly (has no geometry)
			c1: { id: "c1", type: "connector" } as unknown as ObjectState,
		};
		expect(calculateGroupOrientedBounds(objects, "g")).toBeNull();
	});

	it("computes the OBB from the corner points of Frame-style children", () => {
		const objects = {
			g: makeGroup(["f1", "f2"]),
			// (-5,-5) to (5,5)
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			// (15,-5) to (25,5)
			f2: makeFrame("f2", { cx: 20, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// combined range x:[-5,25] y:[-5,5]
		expect(result).not.toBeNull();
		expect(result?.cx).toBeCloseTo(10);
		expect(result?.cy).toBeCloseTo(0);
		expect(result?.width).toBeCloseTo(30);
		expect(result?.height).toBeCloseTo(10);
		expect(result?.rotation).toBe(0);
		expect(result?.scaleX).toBe(1);
		expect(result?.scaleY).toBe(1);
	});

	it("ignores nonexistent child IDs and computes the OBB from the remaining children", () => {
		const objects = {
			g: makeGroup(["ghost", "f1"]),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		expect(result?.cx).toBeCloseTo(0);
		expect(result?.cy).toBeCloseTo(0);
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(10);
	});

	it("computes the OBB from the points array for Poly-style children", () => {
		const objects = {
			g: makeGroup(["p1"]),
			p1: makePoly("p1", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 20 },
			]),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// x:[0,10] y:[0,20]
		expect(result?.cx).toBeCloseTo(5);
		expect(result?.cy).toBeCloseTo(10);
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(20);
	});

	it("computes an OBB containing all points even when Frame and Poly are mixed", () => {
		const objects = {
			g: makeGroup(["f1", "p1"]),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			p1: makePoly("p1", [{ x: 100, y: 100 }]),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// x:[-5,100] y:[-5,100]
		expect(result?.cx).toBeCloseTo(47.5);
		expect(result?.cy).toBeCloseTo(47.5);
		expect(result?.width).toBeCloseTo(105);
		expect(result?.height).toBeCloseTo(105);
	});

	it("recursively collects children of nested groups", () => {
		const objects = {
			g: makeGroup(["inner", "f1"]),
			inner: {
				id: "inner",
				type: "group",
				childIds: ["f2"],
				cx: 0,
				cy: 0,
				width: 0,
				height: 0,
			} as unknown as ObjectState,
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
			f2: makeFrame("f2", { cx: 20, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// including the nested f2, x:[-5,25] y:[-5,5]
		expect(result?.cx).toBeCloseTo(10);
		expect(result?.width).toBeCloseTo(30);
		expect(result?.height).toBeCloseTo(10);
	});

	it("preserves the group's rotation / scale as the OBB's transform", () => {
		const objects = {
			g: makeGroup(["f1"], { rotation: 90, scaleX: 2, scaleY: 3 }),
			f1: makeFrame("f1", { cx: 0, cy: 0, width: 10, height: 10 }),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		expect(result?.rotation).toBe(90);
		expect(result?.scaleX).toBe(2);
		expect(result?.scaleY).toBe(3);
	});

	it("encloses a rotated Frame child by rotating its corner points", () => {
		const objects = {
			g: makeGroup(["f1"]),
			// rotating 90 degrees swaps width and height
			f1: makeFrame("f1", {
				cx: 0,
				cy: 0,
				width: 20,
				height: 10,
				rotation: 90,
			}),
		};

		const result = calculateGroupOrientedBounds(objects, "g");

		// the AABB after rotation is width:10 height:20
		expect(result?.width).toBeCloseTo(10);
		expect(result?.height).toBeCloseTo(20);
	});
});
