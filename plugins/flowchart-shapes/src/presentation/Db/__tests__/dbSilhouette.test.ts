import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { DB_CAP_RATIO } from "../../../schema/db/DbDoc";
import { dbOutline } from "../dbOutline";

/**
 * The cylinder is written twice — the renderer's `buildDbPaths` and this
 * outline — but the renderer's builder is private to Db.tsx, so the two cannot
 * be measured against each other the way the stored-data caps are. What is
 * asserted here instead are the properties a drift in either would break: the
 * caps are the ellipses DB_CAP_RATIO sizes, and both bulge away from the middle.
 *
 * dbOutline.test already pins the bounding box, which a cap flipped to bulge
 * inwards keeps: the silhouette turns into a spool, still touching all four
 * sides, and connectors then meet the shape well inside its top and bottom.
 */

/** The cap ellipse centers, which the straight sides run between. */
const capCentersOf = (
	height: number,
): { capRy: number; topY: number; bottomY: number } => {
	const capRy = height * DB_CAP_RATIO;
	return { capRy, topY: -height / 2 + capRy, bottomY: height / 2 - capRy };
};

/** How far off the ellipse the point is, as a fraction of its radii (0 when on it). */
const calcEllipseError = (
	point: Point,
	centerY: number,
	rx: number,
	ry: number,
): number =>
	Math.abs((point.x / rx) ** 2 + ((point.y - centerY) / ry) ** 2 - 1);

const SIZES: ReadonlyArray<[number, number]> = [
	[100, 80],
	[100, 100],
	[60, 300],
	[400, 60],
];

describe("db silhouette", () => {
	it("puts every outline point on the cap it belongs to, at any aspect ratio", () => {
		for (const [width, height] of SIZES) {
			const { capRy, topY, bottomY } = capCentersOf(height);
			for (const point of dbOutline({ width, height })) {
				// Nothing sits on the straight sides: the sampled caps meet them at
				// their own ends, so a point between the centers would be a cap that
				// stopped short of the box and left a corner unreachable.
				const centerY = point.y <= (topY + bottomY) / 2 ? topY : bottomY;
				expect(
					calcEllipseError(point, centerY, width / 2, capRy),
					`${width}x${height} at (${point.x}, ${point.y})`,
				).toBeCloseTo(0, 9);
				expect(point.y <= topY || point.y >= bottomY).toBe(true);
			}
		}
	});

	it("bulges both caps away from the middle", () => {
		// A cap sampled over the wrong half of its ellipse dishes inwards instead,
		// which the bounding box alone cannot tell apart.
		const points = dbOutline({ width: 100, height: 80 });
		const { topY, bottomY } = capCentersOf(80);
		const highest = points.reduce((best, point) =>
			point.y < best.y ? point : best,
		);
		const lowest = points.reduce((best, point) =>
			point.y > best.y ? point : best,
		);
		expect(highest.x).toBeCloseTo(0, 9);
		expect(highest.y).toBeLessThan(topY);
		expect(lowest.x).toBeCloseTo(0, 9);
		expect(lowest.y).toBeGreaterThan(bottomY);
	});

	it("sizes the caps from the height, so the perspective holds as the box stretches", () => {
		// A cap radius fixed in absolute terms, or taken from the width, flattens
		// or swallows the body at the far ratios.
		for (const [width, height] of SIZES) {
			const { topY, bottomY } = capCentersOf(height);
			const xs = dbOutline({ width, height }).filter(
				(point) => Math.abs(Math.abs(point.x) - width / 2) < 1e-9,
			);
			// The straight sides start where each cap reaches the box edge: one
			// point per cap per side.
			expect(xs).toHaveLength(4);
			for (const point of xs) {
				expect(Math.abs(point.y)).toBeCloseTo(Math.abs(topY), 9);
			}
			expect(bottomY - topY).toBeCloseTo(height * (1 - 2 * DB_CAP_RATIO), 9);
		}
	});
});
