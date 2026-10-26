import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import { createPolyBehavior } from "../PolyController";
import { rotatePolyByGroup, transformPolyByGroup } from "../PolyTransform";

const makePolygon = (points: { x: number; y: number }[]): PolygonState =>
	({
		id: "polygon-1",
		type: "polygon",
		points,
	}) as unknown as PolygonState;

const makePolyline = (points: { x: number; y: number }[]): PolylineState =>
	({
		id: "polyline-1",
		type: "polyline",
		points,
	}) as unknown as PolylineState;

const makeGroup = (overrides?: Partial<GroupState>): GroupState =>
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

const polygonBehavior = createPolyBehavior<PolygonState>();
const polylineBehavior = createPolyBehavior<PolylineState>();

describe("createPolyBehavior().moveByDelta", () => {
	it("moves all polygon vertices by delta", () => {
		const result = polygonBehavior.moveByDelta(
			makePolygon([
				{ x: 0, y: 0 },
				{ x: 10, y: 20 },
			]),
			{ x: 5, y: -5 },
		);
		expect(result.points).toEqual([
			{ x: 5, y: -5 },
			{ x: 15, y: 15 },
		]);
	});

	it("moves all polyline vertices by delta", () => {
		const result = polylineBehavior.moveByDelta(
			makePolyline([
				{ x: -80, y: 0 },
				{ x: 80, y: 0 },
			]),
			{ x: 0, y: 10 },
		);
		expect(result.points).toEqual([
			{ x: -80, y: 10 },
			{ x: 80, y: 10 },
		]);
	});

	it("does not mutate the original state", () => {
		const src = makePolygon([{ x: 0, y: 0 }]);
		polygonBehavior.moveByDelta(src, { x: 5, y: 5 });
		expect(src.points[0]).toEqual({ x: 0, y: 0 });
	});
});

describe("createPolyBehavior() delegation of group transforms", () => {
	it("transformByGroup delegates to transformPolyByGroup", () => {
		const polyline = makePolyline([{ x: 10, y: 0 }]);
		const start = makeGroup({ width: 100 });
		const end = makeGroup({ width: 200 });
		expect(polylineBehavior.transformByGroup(polyline, start, end)).toEqual(
			transformPolyByGroup(polyline, start, end),
		);
	});

	it("rotateByGroup delegates to rotatePolyByGroup", () => {
		const polygon = makePolygon([{ x: 10, y: 0 }]);
		const group = makeGroup({ rotation: 0 });
		expect(polygonBehavior.rotateByGroup(polygon, group, 90)).toEqual(
			rotatePolyByGroup(polygon, group, 90),
		);
	});
});
