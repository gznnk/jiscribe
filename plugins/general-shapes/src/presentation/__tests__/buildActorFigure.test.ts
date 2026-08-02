import { describe, it, expect } from "vitest";

import { buildActorFigure } from "../buildActorFigure";
import { parseSvgPathPoints } from "./support/parseSvgPathPoints";

describe("buildActorFigure", () => {
	it("centers the head horizontally and seats it at the top of the box", () => {
		const figure = buildActorFigure(0, 0, 80, 100);
		expect(figure.headCx).toBe(40);
		expect(figure.headCy).toBeCloseTo(figure.headR);
	});

	it("fills the whole box, with the feet on its bottom edge", () => {
		const [x, y, width, height] = [10, 20, 80, 100];
		const figure = buildActorFigure(x, y, width, height);

		expect(figure.headCy - figure.headR).toBeGreaterThanOrEqual(y);

		const points = parseSvgPathPoints(figure.limbsPath);
		expect(points).toHaveLength(8);
		for (const point of points) {
			expect(point.x).toBeGreaterThanOrEqual(x);
			expect(point.x).toBeLessThanOrEqual(x + width);
			expect(point.y).toBeGreaterThanOrEqual(y);
			expect(point.y).toBeLessThanOrEqual(y + height);
		}

		const lowestPoint = Math.max(...points.map((point) => point.y));
		expect(lowestPoint).toBeCloseTo(y + height);
	});

	it("hangs the torso below the head and the legs below the torso", () => {
		const figure = buildActorFigure(0, 0, 80, 100);
		const [neck, hip, , armEnd, , legLeftFoot, , legRightFoot] =
			parseSvgPathPoints(figure.limbsPath);

		expect(neck.y).toBeCloseTo(figure.headCy + figure.headR);
		expect(hip.y).toBeGreaterThan(neck.y);
		expect(legLeftFoot.y).toBeGreaterThan(hip.y);
		expect(legRightFoot.y).toBeCloseTo(legLeftFoot.y);
		expect(armEnd.x).toBeGreaterThan(figure.headCx);
	});

	it("draws torso, arms, and two legs as four open subpaths", () => {
		const figure = buildActorFigure(0, 0, 80, 100);
		expect(figure.limbsPath.match(/M/g)).toHaveLength(4);
		expect(figure.limbsPath).not.toContain("Z");
	});

	it("translates with the origin without changing the shape", () => {
		const atOrigin = buildActorFigure(0, 0, 80, 100);
		const moved = buildActorFigure(100, 200, 80, 100);

		expect(moved.headCx - atOrigin.headCx).toBeCloseTo(100);
		expect(moved.headCy - atOrigin.headCy).toBeCloseTo(200);
		expect(moved.headR).toBeCloseTo(atOrigin.headR);

		const movedPoints = parseSvgPathPoints(moved.limbsPath);
		parseSvgPathPoints(atOrigin.limbsPath).forEach((point, index) => {
			expect(movedPoints[index].x - point.x).toBeCloseTo(100);
			expect(movedPoints[index].y - point.y).toBeCloseTo(200);
		});
	});

	it("caps the arm span on the narrow axis so a wide box does not stretch the limbs", () => {
		const height = 100;
		const wide = buildActorFigure(0, 0, 1000, height);
		const spanFromCenter = Math.max(
			...parseSvgPathPoints(wide.limbsPath).map((p) => Math.abs(p.x - 500)),
		);
		// height bounds the span, not the 1000px width.
		expect(spanFromCenter).toBeCloseTo(height * 0.32);
	});

	it("collapses to a degenerate figure for a zero-sized box rather than producing NaN", () => {
		const figure = buildActorFigure(0, 0, 0, 0);
		expect(figure.headR).toBe(0);
		expect(figure.limbsPath).not.toContain("NaN");
	});
});
