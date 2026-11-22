import type { Point } from "@jiscribe/geometry";
import { expect } from "vitest";

/**
 * Asserts that a centered outline's corners go round the box center exactly
 * once, strictly increasing in angle: a ray from the center then crosses the
 * outline exactly once, so a connector's endpoint moves continuously as its far
 * end is dragged.
 */
export const expectStarShapedAboutCenter = (points: readonly Point[]): void => {
	const angles = points.map((point) => Math.atan2(point.y, point.x));
	let turns = 0;
	const unwrapped = angles.map((angle, index) => {
		if (index > 0 && angle < angles[index - 1]) {
			turns++;
		}
		return angle + turns * Math.PI * 2;
	});
	for (let i = 1; i < unwrapped.length; i++) {
		expect(unwrapped[i]).toBeGreaterThan(unwrapped[i - 1]);
	}
	expect(unwrapped[unwrapped.length - 1] - unwrapped[0]).toBeLessThan(
		Math.PI * 2,
	);
};
