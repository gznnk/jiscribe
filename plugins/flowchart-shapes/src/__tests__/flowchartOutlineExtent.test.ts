import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import type { Dimensions, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { flowchartPlugin } from "../plugin";

/**
 * The selection frame is the geometry box itself (core's Outline draws
 * `width` × `height` and nothing else), and so are the resize handles. A drawing
 * that misses its own box therefore shows up as a frame floating around it — or,
 * the other way round, as a shape spilling out of its own handles. Connectors
 * read the same outline, so either way they meet the shape somewhere it is not.
 *
 * Nothing else catches it: every one of these draws correctly, connects
 * correctly and tests green at the size its stencil drops it in at. So the
 * invariant is asserted here, over whatever shapes the plugin registers, and at
 * several aspect ratios — a flowchart box is resized freely, and a cap or bevel
 * sized from one side alone only escapes once the other side is far from it.
 */

/** Tolerance as a percentage of the box; a shape reaching its edge needs none. */
const MAX_GAP_PERCENT = 1;

/**
 * Tolerance for running *past* an edge. Unlike the gap there is no shape this is
 * meant to accommodate, so it only absorbs floating-point noise.
 */
const MAX_OVERFLOW_PERCENT = 1e-9;

/**
 * The boxes every shape is measured in: a square, then each side stretched well
 * past what the defaults use, since resizing is unconstrained.
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
 * Every outline in this package reads nothing but width/height; the definition
 * types it against the shape's whole State, so the cast is what lets a bare box
 * stand in for one.
 */
const outlinesOf = (): Array<[string, ObjectOutlineCalculator<Dimensions>]> =>
	Object.entries(flowchartPlugin.objects ?? {}).flatMap(([type, definition]) =>
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

describe("flowchart shapes fill their box", () => {
	it("draws out to every edge of the bounding box, at every aspect ratio", () => {
		const short: string[] = [];
		for (const [type, calcOutline] of outlinesOf()) {
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
});
