import { describe, it, expect } from "vitest";

import { buildClockFigure } from "../buildClockFigure";

/** The end of an `M x y L x y` segment. */
const endOf = (path: string): { x: number; y: number } => {
	const match = path.match(/L (-?[\d.e-]+) (-?[\d.e-]+)$/);
	return { x: Number(match?.[1]), y: Number(match?.[2]) };
};

describe("buildClockFigure", () => {
	it("keeps the face as the only filled silhouette, so a fill skips the hands", () => {
		const figure = buildClockFigure(-50, -50, 100, 100);
		expect(figure.body).toHaveLength(1);
		// Two hands and four quarter marks, all stroked only.
		expect(figure.detail).toHaveLength(6);
	});

	it("shows ten past ten: the hour hand up-left, the longer minute hand up-right", () => {
		const figure = buildClockFigure(-50, -50, 100, 100);
		const hourEnd = endOf(figure.detail![0]);
		const minuteEnd = endOf(figure.detail![1]);
		expect(figure.detail![0]).toMatch(/^M 0 0 L/);
		expect(figure.detail![1]).toMatch(/^M 0 0 L/);
		expect(hourEnd.x).toBeLessThan(0);
		expect(hourEnd.y).toBeLessThan(0);
		expect(minuteEnd.x).toBeGreaterThan(0);
		expect(minuteEnd.y).toBeLessThan(0);
		expect(Math.hypot(minuteEnd.x, minuteEnd.y)).toBeGreaterThan(
			Math.hypot(hourEnd.x, hourEnd.y),
		);
	});

	it("keeps the quarter marks inside the face", () => {
		const figure = buildClockFigure(-50, -50, 100, 100);
		for (const mark of figure.detail!.slice(2)) {
			const end = endOf(mark);
			expect(Math.hypot(end.x, end.y)).toBeLessThan(50);
		}
	});

	it("stretches the hands with the face in a stretched box", () => {
		const minuteEnd = endOf(buildClockFigure(-100, -25, 200, 50).detail![1]);
		const squareMinuteEnd = endOf(
			buildClockFigure(-50, -50, 100, 100).detail![1],
		);
		expect(minuteEnd.x).toBeCloseTo(squareMinuteEnd.x * 2);
		expect(minuteEnd.y).toBeCloseTo(squareMinuteEnd.y / 2);
	});
});
