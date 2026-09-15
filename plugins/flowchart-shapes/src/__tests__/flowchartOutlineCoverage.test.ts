import { describe, expect, it } from "vitest";

import { flowchartPlugin } from "../plugin";
import { buildSubroutinePath } from "../presentation/Subroutine/buildSubroutinePath";

/**
 * Without an `outline` a shape falls back to its bounding box, which for a
 * flowchart silhouette is wrong nearly everywhere: a connector would meet the
 * diamond at the empty corner beside its tip rather than on the slope. The
 * fallback is invisible until someone draws a connector, so the requirement is
 * asserted here rather than left to review.
 *
 * `subroutine` is the one shape that legitimately has none: its outer contour is
 * the bounding box itself (the two bars are strokes inside it), so the fallback
 * is exact rather than approximate. The path is checked below so the exception
 * rests on the drawing rather than on this comment.
 */
const BOX_SILHOUETTE_TYPES = new Set(["subroutine"]);

describe("flowchart shapes outline coverage", () => {
	it("declares an outline for every shape whose silhouette is not its box", () => {
		const missing = Object.entries(flowchartPlugin.objects ?? {})
			.filter(
				([type, definition]) =>
					!BOX_SILHOUETTE_TYPES.has(type) && definition?.outline === undefined,
			)
			.map(([type]) => type);
		expect(missing).toEqual([]);
	});

	it("keeps the exception list honest", () => {
		for (const type of BOX_SILHOUETTE_TYPES) {
			expect(flowchartPlugin.objects?.[type]?.outline).toBeUndefined();
		}
	});

	it("draws the subroutine's outer contour as the bounding box itself", () => {
		// The first subpath is the closed contour connectors would attach to; the
		// two that follow are the bars, which enclose no area. Reshaping it into
		// anything but the box makes the missing outline a defect.
		const [contour] = buildSubroutinePath(-50, -40, 100, 80).split(" M ");
		expect(contour).toBe("M -50 -40 H 50 V 40 H -50 Z");
	});
});
