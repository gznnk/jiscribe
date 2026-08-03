import { createInsetTextRegion } from "@workspace/canvas-sdk";
import { describe, it, expect } from "vitest";

import { DIAMOND_INSET } from "../../../schema/diamond/DiamondDoc";

describe("diamond textRegion", () => {
	it("角が辺に接する幅・高さ半分の領域を返す", () => {
		const textRegion = createInsetTextRegion({
			top: DIAMOND_INSET,
			right: DIAMOND_INSET,
			bottom: DIAMOND_INSET,
			left: DIAMOND_INSET,
		});
		const result = textRegion({ width: 100, height: 60 }, "body");
		expect(result).toEqual({ x: -25, y: -15, width: 50, height: 30 });
	});
});
