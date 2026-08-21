import { createInsetTextRegion } from "@jiscribe/canvas-sdk";
import { describe, it, expect } from "vitest";

import { DIAMOND_INSET } from "../../../schema/diamond/DiamondDoc";

describe("diamond textRegion", () => {
	it("returns a region half the width and height, its corners touching the edges", () => {
		const textRegion = createInsetTextRegion({
			top: DIAMOND_INSET,
			right: DIAMOND_INSET,
			bottom: DIAMOND_INSET,
			left: DIAMOND_INSET,
		});
		const result = textRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -25, y: -15, width: 50, height: 30 });
	});
});
