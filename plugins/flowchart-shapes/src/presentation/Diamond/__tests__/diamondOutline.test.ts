import { describe, it, expect } from "vitest";

import { diamondOutline } from "../buildDiamondPoints";

describe("diamondOutline", () => {
	it("returns the four centered vertices", () => {
		expect(diamondOutline({ width: 100, height: 60 })).toEqual([
			{ x: 0, y: -30 },
			{ x: 50, y: 0 },
			{ x: 0, y: 30 },
			{ x: -50, y: 0 },
		]);
	});
});
