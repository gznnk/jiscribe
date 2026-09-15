import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcArcX, parsePathArcs } from "../../../__tests__/support/pathArcs";
import { buildDelayPath } from "../buildDelayPath";
import { delayOutline } from "../delayOutline";

/**
 * The delay silhouette is written twice: the renderer draws one SVG arc
 * (buildDelayPath) and the connectors follow a sampled polyline (delayOutline).
 * Only the outline is held to the box by the cross-cutting extent test, so
 * without this the drawing could run out of its box on its own — which is what
 * it used to do, both radii having followed the height alone until a box more
 * than twice as tall as it was wide pushed the straight edges out through the
 * left side.
 */

/**
 * The outline reads nothing but width/height; its declaration types it against
 * the shape's whole State, so the cast is what lets a bare box stand in for one.
 */
const calcOutline = delayOutline as ObjectOutlineCalculator<Dimensions>;

const SIZES: ReadonlyArray<Dimensions> = [
	{ width: 140, height: 80 },
	{ width: 100, height: 100 },
	{ width: 100, height: 200 },
	{ width: 100, height: 400 },
	{ width: 100, height: 600 },
];

/** The path's single bulge, with the straight edges it runs between. */
const bulgeOf = (width: number, height: number) => {
	const arcs = parsePathArcs(
		buildDelayPath(-width / 2, -height / 2, width, height),
	);
	expect(arcs).toHaveLength(1);
	const [bulge] = arcs;
	// The model calcArcX carries holds only for a half ellipse on its own axis.
	expect(bulge.start.x).toBeCloseTo(bulge.end.x, 9);
	expect(Math.abs(bulge.end.y - bulge.start.y) / 2).toBeCloseTo(bulge.ry, 9);
	return bulge;
};

describe("delay silhouette", () => {
	it("spans the full height with the bulge, whatever the box", () => {
		for (const { width, height } of SIZES) {
			const bulge = bulgeOf(width, height);
			expect(bulge.start.y, `${width}x${height}`).toBeCloseTo(-height / 2, 9);
			expect(bulge.end.y, `${width}x${height}`).toBeCloseTo(height / 2, 9);
		}
	});

	it("keeps the drawing inside the box, however tall it is", () => {
		for (const { width, height } of SIZES) {
			const bulge = bulgeOf(width, height);
			// The straight edges run from the box's left side to where the bulge
			// starts; that start is what left the box when the radius outgrew it.
			expect(bulge.start.x, `${width}x${height}`).toBeGreaterThanOrEqual(
				-width / 2 - 1e-9,
			);
			// And the bulge reaches the right side without passing it.
			expect(calcArcX(bulge, 0), `${width}x${height}`).toBeCloseTo(
				width / 2,
				9,
			);
		}
	});

	it("draws a true semicircle until the box is too tall to hold one", () => {
		// Half the height fits within the width, so both radii are it.
		for (const { width, height } of [
			{ width: 140, height: 80 },
			{ width: 100, height: 200 },
		]) {
			const bulge = bulgeOf(width, height);
			expect(bulge.rx, `${width}x${height}`).toBeCloseTo(height / 2, 9);
			expect(bulge.ry, `${width}x${height}`).toBeCloseTo(height / 2, 9);
		}
		// Past that the bulge flattens into the width rather than leaving the box,
		// and the straight edges vanish into the left side.
		const tall = bulgeOf(100, 400);
		expect(tall.rx).toBeCloseTo(100, 9);
		expect(tall.ry).toBeCloseTo(200, 9);
		expect(tall.start.x).toBeCloseTo(-50, 9);
	});

	it("puts every outline point on the edge the renderer draws", () => {
		for (const { width, height } of SIZES) {
			const bulge = bulgeOf(width, height);
			for (const point of calcOutline({ width, height })) {
				const where = `${width}x${height} at (${point.x}, ${point.y})`;
				if (point.x <= bulge.start.x + 1e-9) {
					// On a straight edge: the top and bottom sides of the box.
					expect(Math.abs(point.y), where).toBeCloseTo(height / 2, 9);
				} else {
					expect(point.x, where).toBeCloseTo(calcArcX(bulge, point.y), 9);
				}
			}
		}
	});
});
