import { describe, expect, it } from "vitest";

import { ENVELOPE_CORNER_RATIO } from "../../../schema/envelope/EnvelopeDoc";
import { buildEnvelopeFigure } from "../buildEnvelopeFigure";

/** The `M x y L … L x y` numbers of a detail subpath, in order. */
const numbersOf = (subpath: string): number[] =>
	subpath
		.split(/[^-\d.]+/)
		.filter(Boolean)
		.map(Number);

describe("buildEnvelopeFigure", () => {
	it("creases the flap from the corner arcs, not from beside them", () => {
		const [x, y, width, height] = [-60, -42, 120, 84];
		const radius = Math.min(width, height) * ENVELOPE_CORNER_RATIO;
		const figure = buildEnvelopeFigure(x, y, width, height);

		expect(figure.detail).toHaveLength(1);
		const [startX, startY, , , endX, endY] = numbersOf(figure.detail![0]);

		// Both ends sit on their corner arc, so the flap neither pokes outside the
		// body nor stops short of the corner: distance from the arc's center is
		// exactly the radius.
		for (const [px, py, cx] of [
			[startX, startY, x + radius],
			[endX, endY, x + width - radius],
		]) {
			expect(Math.hypot(px - cx, py - (y + radius))).toBeCloseTo(radius);
		}

		// And it is the 45° point of that arc — the closest the body comes to the
		// box corner — so the two offsets from the corner are equal.
		expect(startX - x).toBeCloseTo(startY - y);
		expect(x + width - endX).toBeCloseTo(endY - y);
	});

	it("dips the crease to the flap depth on the center line", () => {
		const figure = buildEnvelopeFigure(-60, -42, 120, 84);
		const [, , creaseX, creaseY] = numbersOf(figure.detail![0]);
		expect(creaseX).toBe(0);
		expect(creaseY).toBeCloseTo(-42 + 84 * 0.56);
	});

	it("draws the body as the only hit-tested silhouette", () => {
		const figure = buildEnvelopeFigure(-60, -42, 120, 84);
		expect(figure.body).toHaveLength(1);
		expect(figure.hit).toBeUndefined();
	});
});
