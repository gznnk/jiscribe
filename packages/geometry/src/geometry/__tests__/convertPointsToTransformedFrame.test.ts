import { describe, it, expect } from "vitest";

import { convertPointsToTransformedFrame } from "../../geometry/convertPointsToTransformedFrame";

describe("convertPointsToTransformedFrame", () => {
	it("returns null for an empty array", () => {
		const result = convertPointsToTransformedFrame([]);
		expect(result).toBeNull();
	});

	it("returns a zero-sized frame for a single point", () => {
		const result = convertPointsToTransformedFrame([{ x: 10, y: 20 }]);
		expect(result).not.toBeNull();
		expect(result!.cx).toBe(10);
		expect(result!.cy).toBe(20);
		expect(result!.width).toBe(0);
		expect(result!.height).toBe(0);
	});

	it("builds the enclosing frame from four rectangle corners", () => {
		const result = convertPointsToTransformedFrame([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 60 },
			{ x: 0, y: 60 },
		]);
		expect(result).not.toBeNull();
		expect(result!.cx).toBe(50);
		expect(result!.cy).toBe(30);
		expect(result!.width).toBe(100);
		expect(result!.height).toBe(60);
		expect(result!.rotation).toBe(0);
		expect(result!.scaleX).toBe(1);
		expect(result!.scaleY).toBe(1);
	});
});
