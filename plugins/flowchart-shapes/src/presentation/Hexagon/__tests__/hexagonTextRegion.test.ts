import { createInsetTextRegion } from "@jiscribe/canvas-sdk";
import { describe, it, expect } from "vitest";

import { HEXAGON_CAP_RATIO } from "../../../schema/hexagon/HexagonDoc";

/** Any family: these calculators derive their region from the box and read no context. */
const TEXT_REGION_CONTEXT = { fontFamily: "sans-serif" };

describe("hexagon textRegion", () => {
	it("returns a region inset by one cap on both sides", () => {
		const textRegion = createInsetTextRegion({
			left: HEXAGON_CAP_RATIO,
			right: HEXAGON_CAP_RATIO,
		});
		const result = textRegion(
			{ width: 100, height: 60 },
			"body",
			TEXT_REGION_CONTEXT,
		);
		expect(result).toEqual({ x: -30, y: -30, width: 60, height: 60 });
	});
});
