import { describe, it, expect } from "vitest";

import { gearOutline } from "../gear/gearOutline";
import { expectStarShapedAboutCenter } from "./support/expectStarShapedAboutCenter";

describe("gearOutline", () => {
	it("is star-shaped about the center, so a connector endpoint moves continuously", () => {
		// Following the teeth exactly is only safe because the rim is star-shaped.
		expectStarShapedAboutCenter(gearOutline({ width: 100, height: 100 }));
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
