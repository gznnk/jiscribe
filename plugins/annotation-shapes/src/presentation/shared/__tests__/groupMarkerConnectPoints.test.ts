import type { ObjectState } from "@workspace/canvas";
import { describe, expect, it } from "vitest";

import type { GroupMarkerTipFields } from "../../../schema/shared/GroupMarkerFields";
import { calcGroupMarkerConnectPoints } from "../groupMarkerConnectPoints";
import { groupMarkerGeometryKey } from "../groupMarkerGeometryKey";

/** A tall marker band: 24 wide, 160 long, so local x spans ±12 and y spans ±80. */
const verticalBand = { width: 24, height: 160 };

/** The same band laid on its side, for the up / down facings. */
const horizontalBand = { width: 160, height: 24 };

describe("calcGroupMarkerConnectPoints", () => {
	it("offers exactly one point, the tip", () => {
		const points = calcGroupMarkerConnectPoints(verticalBand);
		expect(points).toHaveLength(1);
		expect(points[0].id).toBe("tip");
	});

	it("puts the tip on the faced edge, at the center by default", () => {
		expect(calcGroupMarkerConnectPoints(verticalBand)[0].point).toEqual({
			x: -12,
			y: 0,
		});
		expect(
			calcGroupMarkerConnectPoints({ ...verticalBand, direction: "right" })[0]
				.point,
		).toEqual({ x: 12, y: 0 });
		expect(
			calcGroupMarkerConnectPoints({ ...horizontalBand, direction: "up" })[0]
				.point,
		).toEqual({ x: 0, y: -12 });
		expect(
			calcGroupMarkerConnectPoints({ ...horizontalBand, direction: "down" })[0]
				.point,
		).toEqual({ x: 0, y: 12 });
	});

	it("slides the tip along the span with tipPosition", () => {
		expect(
			calcGroupMarkerConnectPoints({ ...verticalBand, tipPosition: 0 })[0]
				.point,
		).toEqual({ x: -12, y: -80 });
		expect(
			calcGroupMarkerConnectPoints({ ...verticalBand, tipPosition: 1 })[0]
				.point,
		).toEqual({ x: -12, y: 80 });
		expect(
			calcGroupMarkerConnectPoints({
				...horizontalBand,
				direction: "down",
				tipPosition: 0.25,
			})[0].point,
		).toEqual({ x: -40, y: 12 });
	});

	it("points the outward direction the way the marker faces", () => {
		expect(calcGroupMarkerConnectPoints(verticalBand)[0].direction).toEqual({
			x: -1,
			y: 0,
		});
		expect(
			calcGroupMarkerConnectPoints({ ...verticalBand, direction: "right" })[0]
				.direction,
		).toEqual({ x: 1, y: 0 });
		expect(
			calcGroupMarkerConnectPoints({ ...horizontalBand, direction: "up" })[0]
				.direction,
		).toEqual({ x: 0, y: -1 });
		expect(
			calcGroupMarkerConnectPoints({ ...horizontalBand, direction: "down" })[0]
				.direction,
		).toEqual({ x: 0, y: 1 });
	});

	it("measures the span across the box the renderer draws into", () => {
		// Same call shape as createGroupMarkerObject: box top-left at -w/2, -h/2.
		// Facing up, the span is the width (24), so 0.3 of it is 7.2 from the left.
		const [tip] = calcGroupMarkerConnectPoints({
			...verticalBand,
			direction: "up",
			tipPosition: 0.3,
		});
		expect(tip.point.x).toBeCloseTo(-4.8);
		expect(tip.point.y).toBe(-80);
	});
});

describe("groupMarkerGeometryKey", () => {
	const brace = (
		extra: GroupMarkerTipFields = {},
	): ObjectState & GroupMarkerTipFields =>
		({ id: "b1", type: "brace", ...extra }) as unknown as ObjectState &
			GroupMarkerTipFields;

	it("gives an absent field and its explicit default the same key", () => {
		expect(groupMarkerGeometryKey(brace())).toBe(
			groupMarkerGeometryKey(brace({ direction: "left", tipPosition: 0.5 })),
		);
	});

	it("changes when either field moves the tip", () => {
		const base = groupMarkerGeometryKey(brace());
		expect(groupMarkerGeometryKey(brace({ direction: "up" }))).not.toBe(base);
		expect(groupMarkerGeometryKey(brace({ tipPosition: 0.25 }))).not.toBe(base);
	});
});
