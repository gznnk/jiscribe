import { describe, it, expect } from "vitest";

import { buildLockFigure } from "../buildLockFigure";

describe("buildLockFigure", () => {
	it("gives the shackle a hit path, since an open arc paints nothing to hit", () => {
		const figure = buildLockFigure(-45, -55, 90, 110);
		expect(figure.hit).toHaveLength(1);
		// The drawn arc, closed across the bottom. Without it the upper part of the
		// box is invisible to elementsFromPoint, so no connector can be dropped
		// anywhere near the top anchor.
		expect(figure.hit![0]).toBe(`${figure.detail![0]} Z`);
	});

	it("keeps the body block as the only filled silhouette", () => {
		expect(buildLockFigure(-45, -55, 90, 110).body).toHaveLength(1);
	});

	it("starts and ends on the body's top edge, so closing it encloses the arch", () => {
		const figure = buildLockFigure(-45, -55, 90, 110);
		const bodyTop = -55 + 110 * 0.42;

		const start = figure.hit![0].match(/^M (-?[\d.]+) (-?[\d.]+)/);
		expect(Number(start?.[1])).toBeCloseTo(-90 * 0.24);
		expect(Number(start?.[2])).toBeCloseTo(bodyTop);

		const end = figure.hit![0].match(/V (-?[\d.]+) Z$/);
		expect(Number(end?.[1])).toBeCloseTo(bodyTop);
	});
});
