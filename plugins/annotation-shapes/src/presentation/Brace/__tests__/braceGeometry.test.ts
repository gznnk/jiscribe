import { describe, expect, it } from "vitest";

import { BRACE_DIRECTIONS } from "../../../schema/brace/BraceDoc";
import { calcBraceAxes, calcBraceTip } from "../braceGeometry";
import { buildBracePath } from "../buildBracePath";

/** Every coordinate pair in a path built from only M / Q commands. */
const readPathPoints = (d: string): { x: number; y: number }[] => {
	const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
	return Array.from({ length: numbers.length / 2 }, (_, i) => ({
		x: numbers[i * 2],
		y: numbers[i * 2 + 1],
	}));
};

describe("calcBraceAxes", () => {
	it("bulges across the width for a vertical brace", () => {
		expect(calcBraceAxes(24, 160, "left")).toEqual({ depth: 24, span: 160 });
	});

	it("bulges across the height for a horizontal brace", () => {
		expect(calcBraceAxes(300, 30, "down")).toEqual({ depth: 30, span: 300 });
	});
});

describe("calcBraceTip", () => {
	it("puts the tip on the edge the direction points at", () => {
		expect(calcBraceTip(0, 0, 24, 160, "left", 0.5)).toEqual({ x: 0, y: 80 });
		expect(calcBraceTip(0, 0, 24, 160, "right", 0.5)).toEqual({ x: 24, y: 80 });
		expect(calcBraceTip(0, 0, 300, 30, "up", 0.5)).toEqual({ x: 150, y: 0 });
		expect(calcBraceTip(0, 0, 300, 30, "down", 0.5)).toEqual({ x: 150, y: 30 });
	});

	it("measures tipPosition from the top for a vertical brace", () => {
		expect(calcBraceTip(0, 0, 24, 160, "left", 0.25).y).toBe(40);
	});

	it("measures tipPosition from the left for a horizontal brace", () => {
		expect(calcBraceTip(0, 0, 300, 30, "down", 0.25).x).toBe(75);
	});
});

describe("buildBracePath", () => {
	it.each(BRACE_DIRECTIONS)("stays inside the box (%s)", (direction) => {
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
			calcBraceTip(0, 0, 24, 160, "left", 0.25),
		);
	});

	it("draws no fillable silhouette (the path is left open)", () => {
		expect(buildBracePath(0, 0, 24, 160, "left", 0.5)).not.toContain("Z");
	});
});
