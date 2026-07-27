import { describe, expect, it } from "vitest";

import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_THRESHOLD,
} from "../../GestureRecognizerConstants";
import type { ClickSnapshot } from "../../GestureRecognizerTypes";
import { isDoubleClick } from "../isDoubleClick";

// The threshold is defined as a squared value, so the distance boundary is its square root.
const DISTANCE = Math.sqrt(DOUBLE_CLICK_DISTANCE_THRESHOLD);

const snapshot = (overrides: Partial<ClickSnapshot> = {}): ClickSnapshot => ({
	time: 1000,
	clientPos: { x: 0, y: 0 },
	...overrides,
});

describe("isDoubleClick", () => {
	describe("no baseline recorded (previous = null)", () => {
		it("always false when previous is null (the first click is never a doubleClick)", () => {
			expect(isDoubleClick(null, snapshot())).toBe(false);
		});
	});

	describe("all conditions are satisfied", () => {
		it("true when within time and within distance", () => {
			const previous = snapshot({ time: 1000, clientPos: { x: 0, y: 0 } });
			const current = snapshot({ time: 1100, clientPos: { x: 2, y: 1 } });
			expect(isDoubleClick(previous, current)).toBe(true);
		});

		it("true even at distance 0 (exact same position)", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 });
			expect(isDoubleClick(previous, current)).toBe(true);
		});
	});

	describe("time threshold", () => {
		it("exactly at the threshold is outside (false)", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 + DOUBLE_CLICK_THRESHOLD });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("just before the threshold is inside (true)", () => {
			const previous = snapshot({ time: 1000 });
			const current = snapshot({ time: 1000 + DOUBLE_CLICK_THRESHOLD - 1 });
			expect(isDoubleClick(previous, current)).toBe(true);
		});
	});

	describe("distance threshold (screen coordinates)", () => {
		it("a distance exactly at the threshold is outside (false)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE, y: 0 },
			});
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("a distance just under the threshold is inside (true)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE - 0.001, y: 0 },
			});
			expect(isDoubleClick(previous, current)).toBe(true);
		});

		it("distance is measured as the composite of both axes (diagonal directions are false when they exceed the threshold)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			// The distance of (4,4) is √32 ≈ 5.66 > √25=5, so it is outside
			const current = snapshot({ time: 1100, clientPos: { x: 4, y: 4 } });
			expect(isDoubleClick(previous, current)).toBe(false);
		});
	});
});
