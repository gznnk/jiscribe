import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { calcConnectorLabelAnchor } from "../calcConnectorLabelAnchor";

describe("calcConnectorLabelAnchor", () => {
	it("default (position 0.5) returns the midpoint of the route", () => {
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points)).toEqual({ x: 50, y: 0 });
	});

	it("computes the position by ratio of route length even across multiple segments", () => {
		// An L shape of total length 200 (100 + 100). position 0.5 is the bend (corner).
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5)).toEqual({ x: 100, y: 0 });
		expect(calcConnectorLabelAnchor(points, 0.25)).toEqual({ x: 50, y: 0 });
		expect(calcConnectorLabelAnchor(points, 0.75)).toEqual({ x: 100, y: 50 });
	});

	it("position is clamped to 0..1", () => {
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points, -1)).toEqual({ x: 0, y: 0 });
		expect(calcConnectorLabelAnchor(points, 2)).toEqual({ x: 100, y: 0 });
	});

	it("offset shifts along the leftward normal of the travel direction (-dy, dx)", () => {
		// Horizontal rightward segment. The leftward normal is the +y direction.
		const points: Point[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5, 10)).toEqual({ x: 50, y: 10 });
		expect(calcConnectorLabelAnchor(points, 0.5, -10)).toEqual({
			x: 50,
			y: -10,
		});
	});

	it("returns null (or the single point) when there are fewer than 2 points", () => {
		expect(calcConnectorLabelAnchor([])).toBeNull();
		expect(calcConnectorLabelAnchor([{ x: 5, y: 5 }])).toEqual({ x: 5, y: 5 });
	});

	it("a degenerate route of total length 0 returns the start point", () => {
		const points: Point[] = [
			{ x: 7, y: 7 },
			{ x: 7, y: 7 },
		];
		expect(calcConnectorLabelAnchor(points, 0.5, 10)).toEqual({ x: 7, y: 7 });
	});
});
