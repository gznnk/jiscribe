import { describe, it, expect } from "vitest";

import { oppositeDirection } from "../oppositeDirection";

describe("oppositeDirection", () => {
	it("上下・左右を反転する", () => {
		expect(oppositeDirection("up")).toBe("down");
		expect(oppositeDirection("down")).toBe("up");
		expect(oppositeDirection("left")).toBe("right");
		expect(oppositeDirection("right")).toBe("left");
	});
});
