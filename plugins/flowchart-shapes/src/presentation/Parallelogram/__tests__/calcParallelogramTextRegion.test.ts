import { describe, it, expect } from "vitest";

import { calcParallelogramTextRegion } from "../calcParallelogramTextRegion";

describe("calcParallelogramTextRegion", () => {
	it("両側をスキュー1つ分インセットした領域を返す", () => {
		const result = calcParallelogramTextRegion(
			{ width: 100, height: 60 },
			"body",
		);
		expect(result).toEqual({ x: -28, y: -30, width: 56, height: 60 });
	});
});
