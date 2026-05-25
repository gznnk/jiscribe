import { describe, it, expect } from "vitest";

import { normalizeAngle } from "../normalizeAngle";

describe("normalizeAngle", () => {
	it("0は0を返す", () => {
		expect(normalizeAngle(0)).toBe(0);
	});

	it("360は0を返す", () => {
		expect(normalizeAngle(360)).toBe(0);
	});

	it("360超の角度を正規化する", () => {
		expect(normalizeAngle(370)).toBeCloseTo(10);
		expect(normalizeAngle(720)).toBe(0);
	});

	it("負の角度を正規化する", () => {
		expect(normalizeAngle(-10)).toBeCloseTo(350);
		expect(normalizeAngle(-360)).toBe(0);
		expect(normalizeAngle(-370)).toBeCloseTo(350);
	});

	it("0〜360の範囲内はそのまま返す", () => {
		expect(normalizeAngle(180)).toBe(180);
		expect(normalizeAngle(90)).toBe(90);
	});
});
