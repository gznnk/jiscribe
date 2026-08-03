import { createInsetTextRegion } from "@workspace/canvas-sdk";
import { describe, it, expect } from "vitest";

import { PARALLELOGRAM_SKEW_RATIO } from "../../../schema/parallelogram/ParallelogramDoc";

describe("parallelogram textRegion", () => {
	it("両側をスキュー1つ分インセットした領域を返す", () => {
		const textRegion = createInsetTextRegion({
			left: PARALLELOGRAM_SKEW_RATIO,
			right: PARALLELOGRAM_SKEW_RATIO,
		});
		const result = textRegion({ width: 100, height: 60 }, "body");
		expect(result).toEqual({ x: -28, y: -30, width: 56, height: 60 });
	});
});
