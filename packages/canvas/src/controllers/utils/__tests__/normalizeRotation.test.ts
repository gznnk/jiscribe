import { describe, it, expect } from "vitest";

import { normalizeRotation } from "../normalizeRotation";

describe("normalizeRotation", () => {
	describe("boundary values", () => {
		it("0 -> 0", () => {
			expect(normalizeRotation(0)).toBe(0);
		});

		it("360 -> 0 (360 degrees equals 0 degrees)", () => {
			expect(normalizeRotation(360)).toBe(0);
		});

		it("720 -> 0 (two full turns)", () => {
			expect(normalizeRotation(720)).toBe(0);
		});
	});

	describe("positive angles", () => {
		it("90 -> 90", () => {
			expect(normalizeRotation(90)).toBe(90);
		});

		it("180 -> 180", () => {
			expect(normalizeRotation(180)).toBe(180);
		});

		it("270 -> 270", () => {
			expect(normalizeRotation(270)).toBe(270);
		});

		it("370 -> 10 (rounded with PRECISION=3)", () => {
			expect(normalizeRotation(370)).toBe(10);
		});

		it("359.9999 -> 0 (after precision rounding, 360 -> 0 correction)", () => {
			// roundToDecimal(359.9999, 3) = 360.0 -> 0
			expect(normalizeRotation(359.9999)).toBe(0);
		});
	});

	describe("negative angles", () => {
		it("-90 -> 270", () => {
			expect(normalizeRotation(-90)).toBe(270);
		});

		it("-360 -> 0", () => {
			expect(normalizeRotation(-360)).toBe(0);
		});

		it("-0.001 -> 359.999 (3 decimal places)", () => {
			expect(normalizeRotation(-0.001)).toBe(359.999);
		});
	});

	describe("decimal precision", () => {
		it("10.12345 -> 10.123 (rounded to 3 places)", () => {
			expect(normalizeRotation(10.12345)).toBe(10.123);
		});

		it("10.1235 rounds to 10.123 due to floating-point representation", () => {
			expect(normalizeRotation(10.1235)).toBe(10.123);
		});
	});
});
