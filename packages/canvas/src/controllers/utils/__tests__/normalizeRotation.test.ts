import { describe, it, expect } from "vitest";

import { normalizeRotation } from "../normalizeRotation";

describe("normalizeRotation", () => {
	describe("境界値", () => {
		it("0 → 0", () => {
			expect(normalizeRotation(0)).toBe(0);
		});

		it("360 → 0（360度は0度と同値）", () => {
			expect(normalizeRotation(360)).toBe(0);
		});

		it("720 → 0（2周分）", () => {
			expect(normalizeRotation(720)).toBe(0);
		});
	});

	describe("正の角度", () => {
		it("90 → 90", () => {
			expect(normalizeRotation(90)).toBe(90);
		});

		it("180 → 180", () => {
			expect(normalizeRotation(180)).toBe(180);
		});

		it("270 → 270", () => {
			expect(normalizeRotation(270)).toBe(270);
		});

		it("370 → 10（PRECISION=3 で丸め）", () => {
			expect(normalizeRotation(370)).toBe(10);
		});

		it("359.9999 → 0（精度丸め後に 360 → 0 補正）", () => {
			// roundToDecimal(359.9999, 3) = 360.0 → 0
			expect(normalizeRotation(359.9999)).toBe(0);
		});
	});

	describe("負の角度", () => {
		it("-90 → 270", () => {
			expect(normalizeRotation(-90)).toBe(270);
		});

		it("-360 → 0", () => {
			expect(normalizeRotation(-360)).toBe(0);
		});

		it("-0.001 → 359.999（精度 3 桁）", () => {
			expect(normalizeRotation(-0.001)).toBe(359.999);
		});
	});

	describe("小数点の精度", () => {
		it("10.12345 → 10.123（3桁に丸める）", () => {
			expect(normalizeRotation(10.12345)).toBe(10.123);
		});

		it("10.1235 は浮動小数点表現の関係で 10.123 に丸まる", () => {
			expect(normalizeRotation(10.1235)).toBe(10.123);
		});
	});
});
