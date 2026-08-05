import { describe, expect, it } from "vitest";

import { GROUP_MARKER_DIRECTIONS } from "../../../schema/shared/GroupMarkerFields";
import { readPathPoints } from "../../__tests__/support/readPathPoints";
import { calcGroupMarkerTip } from "../../shared/groupMarkerGeometry";
import { buildBracePath } from "../buildBracePath";

describe("buildBracePath", () => {
	it.each(GROUP_MARKER_DIRECTIONS)("stays inside the box (%s)", (direction) => {
		const points = readPathPoints(
			buildBracePath(-12, -80, 24, 160, direction, 0.3),
		);
		expect(points.length).toBeGreaterThan(0);
		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(-12);
			expect(point.x).toBeLessThanOrEqual(12);
			expect(point.y).toBeGreaterThanOrEqual(-80);
			expect(point.y).toBeLessThanOrEqual(80);
		}
	});

	it("starts at one arm end and finishes at the other", () => {
		const d = buildBracePath(0, 0, 24, 160, "left", 0.5);
		const points = readPathPoints(d);
		expect(points[0]).toEqual({ x: 24, y: 0 });
		expect(points[points.length - 1]).toEqual({ x: 24, y: 160 });
	});

	it("turns at the tip", () => {
		const d = buildBracePath(0, 0, 24, 160, "left", 0.25);
		expect(readPathPoints(d)).toContainEqual(
			calcGroupMarkerTip(0, 0, 24, 160, "left", 0.25),
		);
	});

	it("draws no fillable silhouette (the path is left open)", () => {
		expect(buildBracePath(0, 0, 24, 160, "left", 0.5)).not.toContain("Z");
	});
});
