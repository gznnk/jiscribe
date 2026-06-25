import { describe, it, expect } from "vitest";

import { snapToDirection } from "../snapToDirection";

describe("snapToDirection", () => {
	it("優勢な軸の方向を返す", () => {
		expect(snapToDirection(10, 3)).toBe("right");
		expect(snapToDirection(-10, 3)).toBe("left");
		expect(snapToDirection(3, 10)).toBe("down");
		expect(snapToDirection(3, -10)).toBe("up");
	});

	it("斜め（同値）は水平を優先する", () => {
		expect(snapToDirection(5, 5)).toBe("right");
		expect(snapToDirection(-5, -5)).toBe("left");
	});

	it("0 ベクトルでも必ず方向を返す（right）", () => {
		expect(snapToDirection(0, 0)).toBe("right");
	});
});
