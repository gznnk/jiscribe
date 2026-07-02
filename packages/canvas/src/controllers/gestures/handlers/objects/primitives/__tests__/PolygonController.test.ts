import { describe, expect, it } from "vitest";

import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../../../../states/objects/primitives/polygon/PolygonState";
import {
	rotatePolyByGroup,
	transformPolyByGroup,
} from "../../base/PolyTransform";
import {
	moveByDelta,
	rotateByGroup,
	transformByGroup,
} from "../PolygonController";

const makePolygon = (points: { x: number; y: number }[]): PolygonState =>
	({
		id: "polygon-1",
		type: "polygon",
		points,
	}) as unknown as PolygonState;

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

describe("PolygonController.moveByDelta", () => {
	it("moves all vertices by delta", () => {
		const result = moveByDelta(
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

	it("does not mutate the original state", () => {
		const src = makePolygon([{ x: 0, y: 0 }]);
		moveByDelta(src, { x: 5, y: 5 });
		expect(src.points[0]).toEqual({ x: 0, y: 0 });
	});
});

describe("PolygonController delegation of group transforms", () => {
	it("transformByGroup delegates to transformPolyByGroup", () => {
		const polygon = makePolygon([{ x: 10, y: 0 }]);
		const start = makeGroup({ width: 100 });
		const end = makeGroup({ width: 200 });
		expect(transformByGroup(polygon, start, end)).toEqual(
			transformPolyByGroup(polygon, start, end),
		);
	});

	it("rotateByGroup delegates to rotatePolyByGroup", () => {
		const polygon = makePolygon([{ x: 10, y: 0 }]);
		const group = makeGroup({ rotation: 0 });
		expect(rotateByGroup(polygon, group, 90)).toEqual(
			rotatePolyByGroup(polygon, group, 90),
		);
	});
});
