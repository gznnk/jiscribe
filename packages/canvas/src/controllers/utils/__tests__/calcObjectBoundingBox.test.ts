import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import {
	calcObjectBoundingBox,
	calcObjectsBoundingBox,
} from "../calcObjectBoundingBox";

beforeAll(() => {
	initializeObjectRegistry();
});

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation = 0,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const freeConnector = (
	overrides: Partial<Record<string, unknown>> = {},
): ObjectState =>
	({
		id: "connector-1",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 10, y: 20 } } },
		target: { anchor: { kind: "free", point: { x: 110, y: 70 } } },
		...overrides,
	}) as unknown as ObjectState;

describe("calcObjectBoundingBox", () => {
	describe("frame objects", () => {
		it("computes the bounding box of a rect with rotation=0", () => {
			const obj = rect("r", 100, 100, 100, 50);
			expect(calcObjectBoundingBox(obj, { r: obj })).toEqual({
				left: 50,
				top: 75,
				right: 150,
				bottom: 125,
			});
		});

		it("expands the bounding box for a rotated rect", () => {
			// A 100x50 rect rotated 90 degrees occupies a 50x100 axis-aligned box
			const obj = rect("r", 100, 100, 100, 50, 90);
			const bbox = calcObjectBoundingBox(obj, { r: obj });
			expect(bbox).not.toBeNull();
			expect(bbox!.left).toBeCloseTo(75);
			expect(bbox!.right).toBeCloseTo(125);
			expect(bbox!.top).toBeCloseTo(50);
			expect(bbox!.bottom).toBeCloseTo(150);
		});
	});

	describe("poly objects", () => {
		it("computes the bounding box from a polyline's points", () => {
			const obj = poly("pl", [
				{ x: 10, y: 20 },
				{ x: 50, y: 80 },
				{ x: 30, y: 10 },
			]);
			expect(calcObjectBoundingBox(obj, { pl: obj })).toEqual({
				left: 10,
				top: 10,
				right: 50,
				bottom: 80,
			});
		});

		it("returns null for a polyline with empty points", () => {
			const obj = poly("pl", []);
			expect(calcObjectBoundingBox(obj, { pl: obj })).toBeNull();
		});
	});

	describe("group objects", () => {
		it("returns null when childIds is empty", () => {
			expect(calcObjectBoundingBox(group("g", []), {})).toBeNull();
		});

		it("returns null when only nonexistent childIds are present", () => {
			expect(calcObjectBoundingBox(group("g", ["missing"]), {})).toBeNull();
		});

		it("returns the combined bounding box of two rect children", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const g = group("g", ["r1", "r2"]);
			// r1: left=30, top=30, right=70, bottom=70
			// r2: left=130, top=130, right=170, bottom=170
			expect(calcObjectBoundingBox(g, { r1, r2 })).toEqual({
				left: 30,
				top: 30,
				right: 170,
				bottom: 170,
			});
		});

		it("recursively processes nested groups", () => {
			const child = rect("r", 100, 100, 100, 100);
			const innerGroup = group("inner", ["r"]);
			const outerGroup = group("outer", ["inner"]);
			expect(
				calcObjectBoundingBox(outerGroup, { r: child, inner: innerGroup }),
			).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});

		it("ignores empty nested groups", () => {
			const child = rect("r", 100, 100, 100, 100);
			const emptyInner = group("empty", []);
			const outerGroup = group("outer", ["empty", "r"]);
			expect(
				calcObjectBoundingBox(outerGroup, { r: child, empty: emptyInner }),
			).toEqual({ left: 50, top: 50, right: 150, bottom: 150 });
		});

		it("includes a connector child's resolved endpoints, not just its waypoints", () => {
			const connector = freeConnector({ points: [{ x: 60, y: 200 }] });
			const g = group("g", ["connector-1"]);
			// Waypoints alone would give a single point (60, 200); the resolved
			// endpoints (10,20)-(110,70) must widen the box.
			expect(calcObjectBoundingBox(g, { "connector-1": connector })).toEqual({
				left: 10,
				top: 20,
				right: 110,
				bottom: 200,
			});
		});
	});

	describe("connector objects", () => {
		it("computes the bounding box from resolved endpoints plus waypoints", () => {
			const connector = freeConnector({
				points: [
					{ x: -50, y: 40 },
					{ x: 60, y: 200 },
				],
			});
			expect(
				calcObjectBoundingBox(connector, { "connector-1": connector }),
			).toEqual({ left: -50, top: 20, right: 110, bottom: 200 });
		});

		it("uses resolved endpoints even though a connector structurally passes isPoly", () => {
			// A straight connector has an empty points array; the generic isPoly
			// branch would return null. The connector branch must win.
			const connector = freeConnector();
			expect(
				calcObjectBoundingBox(connector, { "connector-1": connector }),
			).toEqual({ left: 10, top: 20, right: 110, bottom: 70 });
		});

		it("returns null when an owned endpoint's referenced object does not exist", () => {
			const connector = freeConnector({
				source: {
					owner: { id: "missing-rect" },
					anchor: { kind: "center" },
				},
			});
			expect(
				calcObjectBoundingBox(connector, { "connector-1": connector }),
			).toBeNull();
		});
	});

	it("returns null for an object of unknown shape", () => {
		const unknownObj = { id: "u", type: "mystery" } as unknown as ObjectState;
		expect(calcObjectBoundingBox(unknownObj, { u: unknownObj })).toBeNull();
	});
});

describe("calcObjectsBoundingBox", () => {
	it("returns null for an empty id list", () => {
		expect(calcObjectsBoundingBox([], {})).toBeNull();
	});

	it("skips missing ids and unions the rest", () => {
		const r1 = rect("r1", 50, 50, 40, 40);
		const r2 = rect("r2", 150, 150, 40, 40);
		expect(calcObjectsBoundingBox(["r1", "missing", "r2"], { r1, r2 })).toEqual(
			{ left: 30, top: 30, right: 170, bottom: 170 },
		);
	});

	it("returns null when no object has a valid extent", () => {
		const emptyPoly = poly("pl", []);
		expect(calcObjectsBoundingBox(["pl", "missing"], { pl: emptyPoly })).toBe(
			null,
		);
	});

	it("unions shapes and connectors in a mixed selection", () => {
		const r = rect("r", 300, 300, 100, 100);
		const connector = freeConnector();
		const objects = { r, "connector-1": connector };
		// rect: 250..350 both axes; connector: (10,20)-(110,70)
		expect(calcObjectsBoundingBox(["r", "connector-1"], objects)).toEqual({
			left: 10,
			top: 20,
			right: 350,
			bottom: 350,
		});
	});
});
