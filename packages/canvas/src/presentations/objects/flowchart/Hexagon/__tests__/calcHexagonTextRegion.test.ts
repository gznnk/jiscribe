import { describe, it, expect } from "vitest";

import { calcHexagonTextRegion } from "../calcHexagonTextRegion";

describe("calcHexagonTextRegion", () => {
	it("両側をキャップ1つ分インセットした領域を返す", () => {
		const result = calcHexagonTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -30, y: -30, width: 60, height: 60 });
	});
});
