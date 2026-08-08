import { describe, expect, it } from "vitest";

import { loopLimitOutlinePoints } from "../buildLoopLimitPoints";
import { calcLoopLimitAnchorRegion } from "../calcLoopLimitAnchorRegion";

/** Vertical extent over which the outline actually reaches the bbox's left edge. */
const straightLeftSide = (
	width: number,
	height: number,
): { top: number; bottom: number } => {
	const points = loopLimitOutlinePoints(
		-width / 2,
		-height / 2,
		width,
		height,
	).filter((point) => point.x === -width / 2);
	return {
		top: Math.min(...points.map((point) => point.y)),
		bottom: Math.max(...points.map((point) => point.y)),
	};
};

describe("calcLoopLimitAnchorRegion", () => {
	it("spans the band below the bevelled corners", () => {
		expect(calcLoopLimitAnchorRegion({ width: 100, height: 100 })).toEqual({
			x: -50,
			y: -25,
			width: 100,
			height: 75,
		});
	});

	it("centers on the middle of the straight side, squashed or stretched", () => {
		for (const [width, height] of [
			[100, 100],
			[120, 80],
			[60, 200],
		]) {
			const region = calcLoopLimitAnchorRegion({ width, height });
			const { top, bottom } = straightLeftSide(width, height);
			expect(region.y + region.height / 2).toBeCloseTo((top + bottom) / 2);
		}
	});

	it("leaves the horizontal center alone so the top / bottom anchors do not move", () => {
		const region = calcLoopLimitAnchorRegion({ width: 120, height: 80 });
		expect(region.x + region.width / 2).toBe(0);
	});
});
