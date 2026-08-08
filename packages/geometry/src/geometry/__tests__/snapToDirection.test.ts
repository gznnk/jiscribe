import { describe, it, expect } from "vitest";

import { snapToDirection } from "../snapToDirection";

describe("snapToDirection", () => {
	it("returns the direction of the dominant axis", () => {
		expect(snapToDirection(10, 3)).toBe("right");
		expect(snapToDirection(-10, 3)).toBe("left");
		expect(snapToDirection(3, 10)).toBe("down");
		expect(snapToDirection(3, -10)).toBe("up");
	});

	it("prefers horizontal on a diagonal tie", () => {
		expect(snapToDirection(5, 5)).toBe("right");
		expect(snapToDirection(-5, -5)).toBe("left");
	});

	it("still returns a direction for the zero vector", () => {
		expect(snapToDirection(0, 0)).toBe("right");
	});
});
