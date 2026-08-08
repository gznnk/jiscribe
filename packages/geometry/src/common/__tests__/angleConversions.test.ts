import { describe, it, expect } from "vitest";

import { degreesToRadians } from "../degreesToRadians";
import { radiansToDegrees } from "../radiansToDegrees";

describe("degreesToRadians", () => {
	it("maps 0 degrees to 0 radians", () => {
		expect(degreesToRadians(0)).toBe(0);
	});

	it("maps 180 degrees to π radians", () => {
		expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
	});

	it("maps 360 degrees to 2π radians", () => {
		expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
	});

	it("maps 90 degrees to π/2 radians", () => {
		expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
	});

	it("converts negative angles", () => {
		expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
	});
});

describe("radiansToDegrees", () => {
	it("maps 0 radians to 0 degrees", () => {
		expect(radiansToDegrees(0)).toBe(0);
	});

	it("maps π radians to 180 degrees", () => {
		expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
	});

	it("maps 2π radians to 360 degrees", () => {
		expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
	});

	it("inverts degreesToRadians", () => {
		expect(radiansToDegrees(degreesToRadians(45))).toBeCloseTo(45);
		expect(radiansToDegrees(degreesToRadians(270))).toBeCloseTo(270);
	});
});
