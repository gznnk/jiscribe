import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import type { Dimensions, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { generalPlugin } from "../plugin";

/**
 * The selection frame is the geometry box itself (core's Outline draws
 * `width` × `height` and nothing else), and so are the resize handles. A drawing
 * that misses its own box therefore shows up as a frame floating around it — or,
 * the other way round, as a shape spilling out of its own handles. The lock
 * shipped with the first, 6% clear of the sides and 10% clear of the top, until
 * its default size was matched to its proportions instead of the other way
 * round; the folder shipped with the second, its tab's slant running past the
 * right edge once the box was taller than about 1:4.8.
 *
 * Nothing else catches either: both draw correctly, connect correctly and test
 * green. So the invariant is asserted here, over whatever shapes the plugin
 * registers, and at several aspect ratios — a shape is resized freely, and the
 * folder's overshoot was invisible at the square box this used to sample alone.
 */

/** Tolerance as a percentage of the box. The gear needs 0.62% (see below). */
const MAX_GAP_PERCENT = 1;

/**
 * Tolerance for running *past* an edge. Unlike the gap there is no shape this is
 * meant to accommodate, so it only absorbs floating-point noise.
 */
const MAX_OVERFLOW_PERCENT = 1e-9;

/**
 * The boxes every shape is measured in: a square, then each side stretched well
 * past what the defaults use, since resizing is unconstrained. 1:6 is the ratio
 * the folder's tab used to escape at.
 */
const SIZES: ReadonlyArray<Dimensions> = [
	{ width: 100, height: 100 },
	{ width: 400, height: 100 },
	{ width: 100, height: 400 },
	{ width: 600, height: 100 },
	{ width: 100, height: 600 },
	{ width: 20, height: 20 },
];

/**
 * Shapes excused from the gap rule. The overflow rule binds every shape that
 * registers an outline; one that registers none is out of both already, by
 * `outlinesOf`.
 */
const GAP_EXEMPT: Record<string, string> = {
	// A stick figure encloses nothing, so it registers no outline to measure.
	// generalOutlineCoverage covers the fact that it is the only such shape.
	actor: "no outline",
	// Pre-existing shape, moved here from core unchanged. Its bumps are cubics
	// whose control points sit on the box edges while the curve itself stays
	// ~9.4% clear of them. Reshaping it is a separate decision from this rule.
	cloud: "bumpy silhouette, measured 9.4%",
};

/**
 * Every outline in this package reads nothing but width/height; the definition
 * types it against the shape's whole State, so the cast is what lets a bare box
 * stand in for one.
 */
const outlinesOf = (): Array<[string, ObjectOutlineCalculator<Dimensions>]> =>
	Object.entries(generalPlugin.objects ?? {}).flatMap(([type, definition]) =>
		definition?.outline
			? [[type, definition.outline as ObjectOutlineCalculator<Dimensions>]]
			: [],
	);

/**
 * How far the outline stops short of the box edge it clears by the most, as a
 * percentage of that side — so a reading means the same thing on either axis
 * however the box is stretched.
 */
const maxGapPercent = (
	points: readonly Point[],
	{ width, height }: Dimensions,
): number => {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	return Math.max(
		((Math.min(...xs) + width / 2) / width) * 100,
		((width / 2 - Math.max(...xs)) / width) * 100,
		((Math.min(...ys) + height / 2) / height) * 100,
		((height / 2 - Math.max(...ys)) / height) * 100,
	);
};

/** How far the outline runs past the box edge it overshoots the most, same units. */
const maxOverflowPercent = (
	points: readonly Point[],
	{ width, height }: Dimensions,
): number =>
	Math.max(
		...points.map((point) =>
			Math.max(
				((Math.abs(point.x) - width / 2) / width) * 100,
				((Math.abs(point.y) - height / 2) / height) * 100,
			),
		),
	);

describe("general shapes fill their box", () => {
	it("draws out to every edge of the bounding box, at every aspect ratio", () => {
		const short: string[] = [];
		for (const [type, calcOutline] of outlinesOf()) {
			if (type in GAP_EXEMPT) {
				continue;
			}
			for (const size of SIZES) {
				const gap = maxGapPercent(calcOutline(size), size);
				if (gap > MAX_GAP_PERCENT) {
					short.push(
						`${type} ${size.width}x${size.height} (${gap.toFixed(1)}%)`,
					);
				}
			}
		}
		expect(short).toEqual([]);
	});

	it("stays inside the bounding box, at every aspect ratio", () => {
		const spilling: string[] = [];
		for (const [type, calcOutline] of outlinesOf()) {
			for (const size of SIZES) {
				const overflow = maxOverflowPercent(calcOutline(size), size);
				if (overflow > MAX_OVERFLOW_PERCENT) {
					spilling.push(
						`${type} ${size.width}x${size.height} (${overflow.toFixed(1)}%)`,
					);
				}
			}
		}
		expect(spilling).toEqual([]);
	});

	it("keeps the exemption list from outliving its shapes", () => {
		for (const type of Object.keys(GAP_EXEMPT)) {
			expect(generalPlugin.objects?.[type]).toBeDefined();
		}
	});
});
