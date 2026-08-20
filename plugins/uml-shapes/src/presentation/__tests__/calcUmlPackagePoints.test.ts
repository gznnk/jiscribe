import { describe, expect, it } from "vitest";

import { calcUmlPackagePoints } from "../calcUmlPackagePoints";
import { calcUmlPackageTextRegion } from "../calcUmlPackageTextRegion";
import { umlPackageOutline } from "../umlPackageOutline";

/**
 * The default box, whose 108px of height leaves the tab at its full 16px, and a
 * short box, where the quarter-height clamp takes over (calcUmlPackageTabHeight).
 */
const DEFAULT_SIZE = { width: 160, height: 108 };
const SHORT_SIZE = { width: 160, height: 40 };

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("calcUmlPackagePoints", () => {
	it("draws the tab at 40% of the width and 16px tall on a box that fits it", () => {
		const { width, height } = DEFAULT_SIZE;
		expect(calcUmlPackagePoints(0, 0, width, height)).toEqual([
			{ x: 0, y: 0 },
			{ x: 64, y: 0 },
			{ x: 64, y: 16 },
			{ x: 160, y: 16 },
			{ x: 160, y: 108 },
			{ x: 0, y: 108 },
		]);
	});

	it("clamps the tab to a quarter of the height on a short box", () => {
		const { width, height } = SHORT_SIZE;
		const [, , tabFoot] = calcUmlPackagePoints(0, 0, width, height);
		expect(tabFoot).toEqual({ x: 64, y: 10 });
	});

	it("keeps the silhouette inside its bounding box, out to every edge", () => {
		for (const { width, height } of [DEFAULT_SIZE, SHORT_SIZE]) {
			const points = calcUmlPackagePoints(0, 0, width, height);
			expect(Math.min(...points.map((point) => point.x))).toBe(0);
			expect(Math.max(...points.map((point) => point.x))).toBe(width);
			expect(Math.min(...points.map((point) => point.y))).toBe(0);
			expect(Math.max(...points.map((point) => point.y))).toBe(height);
		}
	});
});

describe("umlPackageOutline", () => {
	it("returns the same silhouette about the shape center", () => {
		expect(umlPackageOutline(DEFAULT_SIZE)).toEqual(
			calcUmlPackagePoints(-80, -54, 160, 108),
		);
	});
});

describe("calcUmlPackageTextRegion", () => {
	it("spans the body below the tab, in full", () => {
		expect(
			calcUmlPackageTextRegion(DEFAULT_SIZE, "text", TEXT_REGION_CONTEXT),
		).toEqual({
			x: -80,
			y: -38,
			width: 160,
			height: 92,
		});
	});

	it("follows the clamped tab on a short box", () => {
		expect(
			calcUmlPackageTextRegion(SHORT_SIZE, "text", TEXT_REGION_CONTEXT),
		).toEqual({
			x: -80,
			y: -10,
			width: 160,
			height: 30,
		});
	});
});
