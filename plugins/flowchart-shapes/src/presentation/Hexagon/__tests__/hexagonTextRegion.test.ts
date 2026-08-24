import { createInsetTextRegion } from "@jiscribe/canvas-sdk";
import { describe, it, expect } from "vitest";

import { HEXAGON_CAP_RATIO } from "../../../schema/hexagon/HexagonDoc";

describe("hexagon textRegion", () => {
	it("returns a region inset by one cap on both sides", () => {
		const textRegion = createInsetTextRegion({
			left: HEXAGON_CAP_RATIO,
			right: HEXAGON_CAP_RATIO,
		});
		const result = textRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -30, y: -30, width: 60, height: 60 });
	});
});
