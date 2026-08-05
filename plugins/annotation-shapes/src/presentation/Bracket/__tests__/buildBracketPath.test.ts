import { describe, expect, it } from "vitest";

import { GROUP_MARKER_DIRECTIONS } from "../../../schema/shared/GroupMarkerFields";
import { readPathPoints } from "../../__tests__/support/readPathPoints";
import { calcGroupMarkerTip } from "../../shared/groupMarkerGeometry";
import { buildBracketPath } from "../buildBracketPath";

describe("buildBracketPath", () => {
	it.each(GROUP_MARKER_DIRECTIONS)("stays inside the box (%s)", (direction) => {
		const points = readPathPoints(
			buildBracketPath(-12, -80, 24, 160, direction),
		);
		expect(points).toHaveLength(4);
		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(-12);
			expect(point.x).toBeLessThanOrEqual(12);
			expect(point.y).toBeGreaterThanOrEqual(-80);
			expect(point.y).toBeLessThanOrEqual(80);
		}
	});

	it("runs the spine along the outer edge, feet reaching the other one", () => {
		// A left bracket: the spine sits on x = 0 and both feet reach x = 24.
		expect(readPathPoints(buildBracketPath(0, 0, 24, 160, "left"))).toEqual([
			{ x: 24, y: 0 },
			{ x: 0, y: 0 },
			{ x: 0, y: 160 },
			{ x: 24, y: 160 },
		]);
	});

	it.each(GROUP_MARKER_DIRECTIONS)(
		"passes through the label anchor at the middle of the spine (%s)",
		(direction) => {
			const points = readPathPoints(
				buildBracketPath(-12, -80, 24, 160, direction),
			);
			const tip = calcGroupMarkerTip(-12, -80, 24, 160, direction, 0.5);
			// The anchor is the midpoint of the spine, which is the segment between
			// the two turns; no vertex lands on it, so it is checked as the average.
			expect({
				x: (points[1].x + points[2].x) / 2,
				y: (points[1].y + points[2].y) / 2,
			}).toEqual(tip);
		},
	);

	it("draws a single open sub-path (no stem, nothing to close)", () => {
		const d = buildBracketPath(0, 0, 24, 160, "left");
		expect(d).not.toContain("Z");
		expect(d.match(/M/g)).toHaveLength(1);
	});
});
