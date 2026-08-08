import { describe, it, expect } from "vitest";

import { buildGearFigure } from "../buildGearFigure";

describe("buildGearFigure", () => {
	it("carries the bore as a second subpath of the body and asks for evenodd", () => {
		const figure = buildGearFigure(-50, -50, 100, 100);
		expect(figure.body).toHaveLength(1);
		// Two "M" commands: the rim, then the bore that has to be punched out of it.
		expect(figure.body[0].match(/M/g)).toHaveLength(2);
		expect(figure.fillRule).toBe("evenodd");
	});

	it("draws no detail lines, so a fill reaches the whole rim", () => {
		expect(buildGearFigure(-50, -50, 100, 100).detail).toBeUndefined();
	});

	it("repeats the punched-out bore as a hit path, so the center is not dead", () => {
		const figure = buildGearFigure(-50, -50, 100, 100);
		expect(figure.hit).toHaveLength(1);
		// The very same subpath the body punches out: the hole cannot be hit-tested
		// where it is not painted, and the center is where a pointer aims.
		expect(figure.body[0]).toContain(figure.hit![0]);
	});

	it("places the teeth on the box's inscribed ellipse, so a stretched box gives a stretched gear", () => {
		const wide = buildGearFigure(-100, -25, 200, 50);
		const coordinates = [...wide.body[0].matchAll(/-?\d+(\.\d+)?/g)].map(
			(match) => Number(match[0]),
		);
		// No tooth tip sits exactly on the axis (they straddle it), so the widest
		// point falls just short of the box edge and never past it.
		expect(Math.max(...coordinates)).toBeGreaterThan(95);
		expect(Math.max(...coordinates)).toBeLessThanOrEqual(100);
		expect(Math.min(...coordinates)).toBeLessThan(-95);
		expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(-100);
	});
});
