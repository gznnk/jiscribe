import { describe, it, expect } from "vitest";

import { degreesToRadians } from "../degreesToRadians";
import { radiansToDegrees } from "../radiansToDegrees";

describe("degreesToRadians", () => {
	it("0度 → 0ラジアン", () => {
		expect(degreesToRadians(0)).toBe(0);
	});

	it("180度 → πラジアン", () => {
		expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
	});

	it("360度 → 2πラジアン", () => {
		expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
	});

	it("90度 → π/2ラジアン", () => {
		expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
	});

	it("負の角度も変換できる", () => {
		expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
	});
});

describe("radiansToDegrees", () => {
	it("0ラジアン → 0度", () => {
		expect(radiansToDegrees(0)).toBe(0);
	});

	it("πラジアン → 180度", () => {
		expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
	});

	it("2πラジアン → 360度", () => {
		expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
	});

	it("degreesToRadiansの逆変換になっている", () => {
		expect(radiansToDegrees(degreesToRadians(45))).toBeCloseTo(45);
		expect(radiansToDegrees(degreesToRadians(270))).toBeCloseTo(270);
	});
});
