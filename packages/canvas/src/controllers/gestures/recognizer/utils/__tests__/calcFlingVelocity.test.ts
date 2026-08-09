import { describe, expect, it } from "vitest";

import {
	FLING_MAX_SPEED,
	FLING_RELEASE_IDLE_MS,
	FLING_VELOCITY_MIN_SPAN_MS,
} from "../../GestureRecognizerConstants";
import { calcFlingVelocity, type FlingSample } from "../calcFlingVelocity";

const sample = (
	clientX: number,
	clientY: number,
	time: number,
): FlingSample => ({
	clientX,
	clientY,
	time,
});

describe("calcFlingVelocity", () => {
	describe("nothing to glide from", () => {
		it("returns zero for no samples", () => {
			expect(calcFlingVelocity([], 100)).toEqual({ x: 0, y: 0 });
		});

		it("returns zero for a single sample (a press that never moved)", () => {
			expect(calcFlingVelocity([sample(0, 0, 100)], 100)).toEqual({
				x: 0,
				y: 0,
			});
		});

		it("returns zero when the pointer came to rest before lifting", () => {
			const samples = [sample(0, 0, 0), sample(80, 0, 40)];
			const releaseTime = 40 + FLING_RELEASE_IDLE_MS + 1;
			expect(calcFlingVelocity(samples, releaseTime)).toEqual({ x: 0, y: 0 });
		});

		it("still glides when the release is exactly at the idle limit", () => {
			const samples = [sample(0, 0, 0), sample(80, 0, 40)];
			const releaseTime = 40 + FLING_RELEASE_IDLE_MS;
			expect(calcFlingVelocity(samples, releaseTime).x).toBeCloseTo(2, 10);
		});

		it("returns zero when the samples span less than the minimum (an event burst)", () => {
			const span = FLING_VELOCITY_MIN_SPAN_MS - 1;
			const samples = [sample(0, 0, 0), sample(150, 0, span)];
			expect(calcFlingVelocity(samples, span)).toEqual({ x: 0, y: 0 });
		});
	});

	describe("estimation", () => {
		it("divides the oldest-to-newest displacement by their time span", () => {
			const samples = [sample(100, 50, 0), sample(140, 30, 20)];
			expect(calcFlingVelocity(samples, 20)).toEqual({ x: 2, y: -1 });
		});

		it("ignores intermediate samples, so a mid-drag pause does not damp the flick", () => {
			// Standing still for the first 40ms then covering 60px in 20ms averages to
			// 1px/ms across the window, which is the measured result by construction.
			const samples = [sample(0, 0, 0), sample(0, 0, 40), sample(60, 0, 60)];
			expect(calcFlingVelocity(samples, 60)).toEqual({ x: 1, y: 0 });
		});

		it("clamps the magnitude, keeping the direction", () => {
			const samples = [sample(0, 0, 0), sample(1000, 1000, 10)];
			const velocity = calcFlingVelocity(samples, 10);
			expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(
				FLING_MAX_SPEED,
				10,
			);
			expect(velocity.x).toBeCloseTo(velocity.y, 10);
			expect(velocity.x).toBeGreaterThan(0);
		});
	});
});
