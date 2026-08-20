import { createInsetTextRegion } from "@jiscribe/canvas-sdk";
import { describe, it, expect } from "vitest";

import { PARALLELOGRAM_SKEW_RATIO } from "../../../schema/parallelogram/ParallelogramDoc";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("parallelogram textRegion", () => {
	it("returns a region inset by one skew on both sides", () => {
		const textRegion = createInsetTextRegion({
			left: PARALLELOGRAM_SKEW_RATIO,
			right: PARALLELOGRAM_SKEW_RATIO,
		});
		const result = textRegion(
			{ width: 100, height: 60 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result).toEqual({ x: -28, y: -30, width: 56, height: 60 });
	});
});
