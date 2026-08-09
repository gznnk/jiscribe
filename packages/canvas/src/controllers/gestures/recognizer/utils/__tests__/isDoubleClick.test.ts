import { describe, expect, it } from "vitest";

import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH,
	DOUBLE_CLICK_THRESHOLD,
} from "../../GestureRecognizerConstants";
import type { ClickSnapshot } from "../../GestureRecognizerTypes";
import { isDoubleClick } from "../isDoubleClick";

// The thresholds are defined as squared values, so the distance boundaries are their square roots.
const DISTANCE = Math.sqrt(DOUBLE_CLICK_DISTANCE_THRESHOLD);
const DISTANCE_TOUCH = Math.sqrt(DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH);

const snapshot = (overrides: Partial<ClickSnapshot> = {}): ClickSnapshot => ({
	time: 1000,
	clientPos: { x: 0, y: 0 },
	button: 0,
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

	describe("button (only the primary button pairs)", () => {
		it("a left click followed by a right click on the same spot is not a pair (select, then open the context menu)", () => {
			const previous = snapshot({ time: 1000, button: 0 });
			const current = snapshot({ time: 1050, button: 2 });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("a right click followed by a left click on the same spot is not a pair either", () => {
			const previous = snapshot({ time: 1000, button: 2 });
			const current = snapshot({ time: 1050, button: 0 });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("two right clicks within both thresholds are not a pair (each one opens the context menu)", () => {
			const previous = snapshot({ time: 1000, button: 2 });
			const current = snapshot({ time: 1050, button: 2 });
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("two middle clicks within both thresholds are not a pair", () => {
			const previous = snapshot({ time: 1000, button: 1 });
			const current = snapshot({ time: 1050, button: 1 });
			expect(isDoubleClick(previous, current)).toBe(false);
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

	describe("touch distance threshold (wider than mouse)", () => {
		it("a touch tap beyond the mouse threshold but within the touch threshold is inside (true)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE + 1, y: 0 },
				pointerType: "touch",
			});
			expect(isDoubleClick(previous, current)).toBe(true);
		});

		it("a touch tap exactly at the touch threshold is outside (false)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE_TOUCH, y: 0 },
				pointerType: "touch",
			});
			expect(isDoubleClick(previous, current)).toBe(false);
		});

		it("a mouse click at the same distance stays outside (the wider threshold is touch-only)", () => {
			const previous = snapshot({ clientPos: { x: 0, y: 0 } });
			const current = snapshot({
				time: 1100,
				clientPos: { x: DISTANCE + 1, y: 0 },
				pointerType: "mouse",
			});
			expect(isDoubleClick(previous, current)).toBe(false);
		});
	});
});
