import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../../../states/objects/primitives/polyline/PolylineState";
import { rotatePolyByGroup, transformPolyByGroup } from "../PolyTransform";

const makeGroup = (overrides: Partial<GroupState>): GroupState =>
	({
		id: "group-1",
		type: "group",
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		childIds: [],
		...overrides,
	}) as unknown as GroupState;

const makePoly = (points: { x: number; y: number }[]): PolylineState =>
	({
		id: "poly-1",
		type: "polyline",
		points,
	}) as unknown as PolylineState;

describe("transformPolyByGroup", () => {
	it("vertices are unchanged when the group is not transformed (start=end)", () => {
		const group = makeGroup({});
		const poly = makePoly([
			{ x: 10, y: 0 },
			{ x: -10, y: 5 },
		]);

		const result = transformPolyByGroup(poly, group, group);

		expect(result.points[0].x).toBeCloseTo(10);
		expect(result.points[0].y).toBeCloseTo(0);
		expect(result.points[1].x).toBeCloseTo(-10);
		expect(result.points[1].y).toBeCloseTo(5);
	});

	it("when the group width doubles, the distance from center also doubles", () => {
		const start = makeGroup({ width: 100 });
		const end = makeGroup({ width: 200 });
		const poly = makePoly([{ x: 10, y: 0 }]);

		const result = transformPolyByGroup(poly, start, end);

		expect(result.points[0].x).toBeCloseTo(20); // (10 - 0) * (200/100)
		expect(result.points[0].y).toBeCloseTo(0);
	});

	it("preserves fields other than points", () => {
		const group = makeGroup({});
		const poly = makePoly([{ x: 1, y: 1 }]);

		const result = transformPolyByGroup(poly, group, group);

		expect(result.id).toBe("poly-1");
		expect(result.type).toBe("polyline");
	});
});

describe("rotatePolyByGroup", () => {
	it("rotates each vertex by rotationDelta around the group center", () => {
		const group = makeGroup({ cx: 0, cy: 0, rotation: 0 });
		const poly = makePoly([{ x: 10, y: 0 }]);

		// 0deg -> 90deg: (10,0) becomes (0,10)
		const result = rotatePolyByGroup(poly, group, 90);

		expect(result.points[0].x).toBeCloseTo(0);
		expect(result.points[0].y).toBeCloseTo(10);
	});

	it("vertices are unchanged when rotationDelta is 0", () => {
		const group = makeGroup({ rotation: 45 });
		const poly = makePoly([{ x: 3, y: 7 }]);

		const result = rotatePolyByGroup(poly, group, 45);

		expect(result.points[0].x).toBeCloseTo(3);
		expect(result.points[0].y).toBeCloseTo(7);
	});
});
