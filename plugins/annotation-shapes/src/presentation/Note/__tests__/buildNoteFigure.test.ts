import { describe, expect, it } from "vitest";

import { calcNoteFoldSize } from "../../../schema/note/calcNoteFoldSize";
import { buildNoteFigure } from "../buildNoteFigure";
import { calcNotePoints } from "../calcNotePoints";

describe("calcNoteFoldSize", () => {
	it("takes the fold off the shorter side, whichever that is", () => {
		// 0.2 of 110 either way, so the same box turned on its side folds the same.
		expect(calcNoteFoldSize(180, 110)).toBeCloseTo(22);
		expect(calcNoteFoldSize(110, 180)).toBeCloseTo(22);
	});

	it("stays a small dog-ear on a long box instead of scaling with it", () => {
		expect(calcNoteFoldSize(600, 110)).toBeCloseTo(22);
	});

	it("collapses to zero for a zero-sized box rather than going negative", () => {
		expect(calcNoteFoldSize(0, 110)).toBe(0);
	});
});

describe("calcNotePoints", () => {
	it("cuts the top-right corner off the box and leaves the other three", () => {
		// Centered origin, as the renderer and the outline use it: fold = 22.
		expect(calcNotePoints(-90, -55, 180, 110)).toEqual([
			{ x: -90, y: -55 },
			{ x: 68, y: -55 },
			{ x: 90, y: -33 },
			{ x: 90, y: 55 },
			{ x: -90, y: 55 },
		]);
	});

	it("keeps the cut a right isosceles triangle on a long box", () => {
		const points = calcNotePoints(0, 0, 600, 110);
		// Both legs are the fold, so the diagonal stays at 45°.
		expect(points[1]).toEqual({ x: 578, y: 0 });
		expect(points[2]).toEqual({ x: 600, y: 22 });
	});
});

describe("buildNoteFigure", () => {
	it("closes the silhouette through the cut corner", () => {
		const { body } = buildNoteFigure(-90, -55, 180, 110);
		expect(body).toBe("M -90 -55 L 68 -55 L 90 -33 L 90 55 L -90 55 Z");
	});

	it("draws the fold as the two legs meeting the silhouette's diagonal", () => {
		const { fold } = buildNoteFigure(-90, -55, 180, 110);
		// Down from the top edge at the cut, then out to the right edge: the
		// diagonal that closes the triangle belongs to the body, not to the fold.
		expect(fold).toBe("M 68 -55 V -33 H 90");
	});

	it("puts the fold's free ends on the silhouette's own cut corners", () => {
		const points = calcNotePoints(0, 0, 240, 160);
		const { fold } = buildNoteFigure(0, 0, 240, 160);
		expect(fold).toBe(
			`M ${points[1].x} ${points[1].y} V ${points[2].y} H ${points[2].x}`,
		);
	});
});
