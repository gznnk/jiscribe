import { describe, expect, it } from "vitest";

import { ARROW_SIZE } from "../ArrowConstants";
import { calcArrowReach } from "../calcArrowReach";

describe("calcArrowReach", () => {
	it("is hypot(length, halfWidth) × strokeWidth × arrowScale, plus the stroke width", () => {
		expect(calcArrowReach("FilledTriangle", 2, 1.5)).toBeCloseTo(
			Math.hypot(ARROW_SIZE, ARROW_SIZE / 2) * 3 + 2,
			9,
		);
	});

	it("reaches past the line inset where the head runs on behind it", () => {
		// CrowFootZeroMany's circle ends 18.45 local units behind the tip.
		expect(calcArrowReach("CrowFootZeroMany", 1, 1)).toBeCloseTo(
			Math.hypot(18.45, ARROW_SIZE / 2) + 1,
			9,
		);
		expect(calcArrowReach("Cross", 1, 1)).toBeCloseTo(
			Math.hypot(ARROW_SIZE * 0.8, ARROW_SIZE * 0.4) + 1,
			9,
		);
	});

	it("is 0 for no head", () => {
		expect(calcArrowReach("None", 2, 4)).toBe(0);
		expect(calcArrowReach(undefined, 2, 4)).toBe(0);
	});
});
