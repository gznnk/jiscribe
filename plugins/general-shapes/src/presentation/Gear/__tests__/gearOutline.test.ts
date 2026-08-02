import { describe, it, expect } from "vitest";

import { gearOutline } from "../gearOutline";

const angleOf = (point: { x: number; y: number }): number =>
	Math.atan2(point.y, point.x);

describe("gearOutline", () => {
	it("is star-shaped about the center, so a connector endpoint moves continuously", () => {
		// Strictly increasing angles mean a ray from the center crosses the rim
		// exactly once — the property that lets the outline follow the teeth
		// instead of falling back to a smooth approximation.
		const points = gearOutline({ width: 100, height: 100 });
		const unwrapped = points.map(angleOf).map((angle, index, all) => {
			let turns = 0;
			for (let i = 1; i <= index; i++) {
				if (all[i] < all[i - 1]) {
					turns++;
				}
			}
			return angle + turns * Math.PI * 2;
		});
		for (let i = 1; i < unwrapped.length; i++) {
			expect(unwrapped[i]).toBeGreaterThan(unwrapped[i - 1]);
		}
	});

	it("reaches the box edge at a tooth but never a box corner", () => {
		const points = gearOutline({ width: 100, height: 100 });
		const radii = points.map((point) => Math.hypot(point.x, point.y));
		expect(Math.max(...radii)).toBeCloseTo(50);
		// The corner is at 70.7; nothing on the rim comes near it, which is the
		// whole reason the bounding-box default was wrong here.
		expect(Math.max(...radii)).toBeLessThan(51);
	});

	it("stretches with the box rather than staying circular", () => {
		const points = gearOutline({ width: 200, height: 50 });
		const widest = Math.max(...points.map((point) => Math.abs(point.x)));
		const tallest = Math.max(...points.map((point) => Math.abs(point.y)));
		// No tooth tip sits exactly on an axis, so neither extent quite reaches the
		// box edge — but both fall short by the same factor, leaving the aspect
		// ratio exactly the box's.
		expect(widest / tallest).toBeCloseTo(200 / 50);
		expect(widest).toBeLessThanOrEqual(100);
	});
});
