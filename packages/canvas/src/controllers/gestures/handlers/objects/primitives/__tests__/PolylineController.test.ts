import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../../../states/objects/primitives/polyline/PolylineState";
import {
	rotatePolyByGroup,
	transformPolyByGroup,
} from "../../base/PolyTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../PolylineController";

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

describe("PolylineController.moveByDelta", () => {
	it("moves all vertices by delta", () => {
		const result = moveByDelta(
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
		const src = makePolyline([{ x: 0, y: 0 }]);
		moveByDelta(src, { x: 5, y: 5 });
		expect(src.points[0]).toEqual({ x: 0, y: 0 });
	});
});

describe("PolylineController delegation of group transforms", () => {
	it("transformByGroup delegates to transformPolyByGroup", () => {
		const polyline = makePolyline([{ x: 10, y: 0 }]);
		const start = makeGroup({ width: 100 });
		const end = makeGroup({ width: 200 });
		expect(transformByGroup(polyline, start, end)).toEqual(
			transformPolyByGroup(polyline, start, end),
		);
	});

	it("rotateByGroup delegates to rotatePolyByGroup", () => {
		const polyline = makePolyline([{ x: 10, y: 0 }]);
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(polyline, group, 90)).toEqual(
			rotatePolyByGroup(polyline, group, 90),
		);
	});
});
