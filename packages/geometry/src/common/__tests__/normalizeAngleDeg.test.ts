import { describe, it, expect } from "vitest";

import { normalizeAngleDeg } from "../normalizeAngleDeg";

describe("normalizeAngleDeg", () => {
	it("0は0を返す", () => {
		expect(normalizeAngleDeg(0)).toBe(0);
	});

	it("360は0を返す", () => {
		expect(normalizeAngleDeg(360)).toBe(0);
	});

	it("360超の角度を正規化する", () => {
		expect(normalizeAngleDeg(370)).toBeCloseTo(10);
		expect(normalizeAngleDeg(720)).toBe(0);
	});

	it("負の角度を正規化する", () => {
		expect(normalizeAngleDeg(-10)).toBeCloseTo(350);
		expect(normalizeAngleDeg(-360)).toBe(0);
		expect(normalizeAngleDeg(-370)).toBeCloseTo(350);
	});

	it("0〜360の範囲内はそのまま返す", () => {
		expect(normalizeAngleDeg(180)).toBe(180);
		expect(normalizeAngleDeg(90)).toBe(90);
	});
});
