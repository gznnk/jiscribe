import { describe, expect, it } from "vitest";

import {
	calcGroupMarkerAxes,
	calcGroupMarkerTip,
} from "../groupMarkerGeometry";

describe("calcGroupMarkerAxes", () => {
	it("reaches across the width for a vertical marker", () => {
		expect(calcGroupMarkerAxes(24, 160, "left")).toEqual({
			depth: 24,
			span: 160,
		});
	});

	it("reaches across the height for a horizontal marker", () => {
		expect(calcGroupMarkerAxes(300, 30, "down")).toEqual({
			depth: 30,
			span: 300,
		});
	});
});

describe("calcGroupMarkerTip", () => {
	it("puts the tip on the edge the direction points at", () => {
		expect(calcGroupMarkerTip(0, 0, 24, 160, "left", 0.5)).toEqual({
			x: 0,
			y: 80,
		});
		expect(calcGroupMarkerTip(0, 0, 24, 160, "right", 0.5)).toEqual({
			x: 24,
			y: 80,
		});
		expect(calcGroupMarkerTip(0, 0, 300, 30, "up", 0.5)).toEqual({
			x: 150,
			y: 0,
		});
		expect(calcGroupMarkerTip(0, 0, 300, 30, "down", 0.5)).toEqual({
			x: 150,
			y: 30,
		});
	});

	it("measures tipPosition from the top for a vertical marker", () => {
		expect(calcGroupMarkerTip(0, 0, 24, 160, "left", 0.25).y).toBe(40);
	});

	it("measures tipPosition from the left for a horizontal marker", () => {
		expect(calcGroupMarkerTip(0, 0, 300, 30, "down", 0.25).x).toBe(75);
	});
});
