import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions, Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { generalPlugin } from "../plugin";

/**
 * The selection frame is the geometry box itself (core's Outline draws
 * `width` × `height` and nothing else), and so are the resize handles. A drawing
 * that stops short of its own box therefore shows up as a frame floating around
 * it — which is how the lock shipped, 6% clear of the sides and 10% clear of the
 * top, until its default size was matched to its proportions instead of the
 * other way round.
 *
 * Nothing else catches that: it draws correctly, connects correctly and tests
 * green. So the invariant is asserted here, over whatever shapes the plugin
 * registers.
 */

/** Tolerance as a percentage of the box. The gear needs 0.62% (see below). */
const MAX_GAP_PERCENT = 1;

const EXEMPT: Record<string, string> = {
	// A stick figure encloses nothing, so it registers no outline to measure.
	// generalOutlineCoverage covers the fact that it is the only such shape.
	actor: "no outline",
	// Pre-existing shape, moved here from core unchanged. Its bumps are cubics
	// whose control points sit on the box edges while the curve itself stays
	// ~9.4% clear of them. Reshaping it is a separate decision from this rule.
	cloud: "bumpy silhouette, measured 9.4%",
};

/** How far the outline stops short of each box edge, as a percentage of the box. */
const maxGapPercent = (points: readonly Point[]): number => {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	return Math.max(
		Math.min(...xs) + 50,
		50 - Math.max(...xs),
		Math.min(...ys) + 50,
		50 - Math.max(...ys),
	);
};

describe("general shapes fill their box", () => {
	it("draws out to every edge of the bounding box", () => {
		const short: string[] = [];
		for (const [type, definition] of Object.entries(
			generalPlugin.objects ?? {},
		)) {
			if (type in EXEMPT || !definition?.outline) {
				continue;
			}
			// Every outline in this package reads nothing but width/height; the
			// definition types it against the shape's whole State, so the cast is
			// what lets a bare box stand in for one. A square box keeps a gap
			// reading as the same percentage whichever edge it is against.
			const calcOutline =
				definition.outline as ObjectOutlineCalculator<Dimensions>;
			const gap = maxGapPercent(calcOutline({ width: 100, height: 100 }));
			if (gap > MAX_GAP_PERCENT) {
				short.push(`${type} (${gap.toFixed(1)}%)`);
			}
		}
		expect(short).toEqual([]);
	});

	it("keeps the exemption list from outliving its shapes", () => {
		for (const type of Object.keys(EXEMPT)) {
			expect(generalPlugin.objects?.[type]).toBeDefined();
		}
	});
});
