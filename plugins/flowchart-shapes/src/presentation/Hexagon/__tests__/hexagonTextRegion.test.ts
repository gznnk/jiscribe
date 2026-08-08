import { createInsetTextRegion } from "@workspace/canvas-sdk";
import { describe, it, expect } from "vitest";

import { HEXAGON_CAP_RATIO } from "../../../schema/hexagon/HexagonDoc";

describe("hexagon textRegion", () => {
	it("両側をキャップ1つ分インセットした領域を返す", () => {
		const textRegion = createInsetTextRegion({
			left: HEXAGON_CAP_RATIO,
			right: HEXAGON_CAP_RATIO,
		});
		const result = textRegion({ width: 100, height: 60 }, "body");
		expect(result).toEqual({ x: -30, y: -30, width: 60, height: 60 });
	});
});
