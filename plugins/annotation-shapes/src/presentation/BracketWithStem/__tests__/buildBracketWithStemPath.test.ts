import { describe, expect, it } from "vitest";

import { GROUP_MARKER_DIRECTIONS } from "../../../schema/shared/GroupMarkerFields";
import { readPathPoints } from "../../__tests__/support/readPathPoints";
import { calcGroupMarkerTip } from "../../shared/groupMarkerGeometry";
import { buildBracketWithStemPath } from "../buildBracketWithStemPath";

describe("buildBracketWithStemPath", () => {
	it.each(GROUP_MARKER_DIRECTIONS)("stays inside the box (%s)", (direction) => {
		const points = readPathPoints(
			buildBracketWithStemPath(-12, -80, 24, 160, direction, 0.3),
		);
		expect(points).toHaveLength(6);
		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(-12);
			expect(point.x).toBeLessThanOrEqual(12);
			expect(point.y).toBeGreaterThanOrEqual(-80);
			expect(point.y).toBeLessThanOrEqual(80);
		}
	});

	it("insets the spine so the stem has room, then runs the stem to the outer edge", () => {
		// A left bracket: the spine sits half way in (x = 12) and the stem runs
		// from it out to x = 0, at a quarter down the span.
		expect(
			readPathPoints(buildBracketWithStemPath(0, 0, 24, 160, "left", 0.25)),
		).toEqual([
			{ x: 24, y: 0 },
			{ x: 12, y: 0 },
			{ x: 12, y: 160 },
			{ x: 24, y: 160 },
			{ x: 12, y: 40 },
			{ x: 0, y: 40 },
		]);
	});

	it.each(GROUP_MARKER_DIRECTIONS)(
		"ends the stem on the tip, which is where the label hangs (%s)",
		(direction) => {
			const points = readPathPoints(
				buildBracketWithStemPath(-12, -80, 24, 160, direction, 0.3),
			);
			expect(points[points.length - 1]).toEqual(
				calcGroupMarkerTip(-12, -80, 24, 160, direction, 0.3),
			);
		},
	);

	it("draws the stem as a second sub-path, both left open", () => {
		const d = buildBracketWithStemPath(0, 0, 24, 160, "left", 0.5);
		expect(d).not.toContain("Z");
		expect(d.match(/M/g)).toHaveLength(2);
	});
});
