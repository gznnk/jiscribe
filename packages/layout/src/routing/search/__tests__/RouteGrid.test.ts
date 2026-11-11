import type { BoundingBox } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import {
	type BorderMarks,
	createRouteLines,
	indexOfGridLine,
	pointIndex,
	toGridLines,
} from "../RouteGrid";

const MARGIN = 30;
const xs = [0, 50, 100, 150, 200];
const ys = [0, 30, 100, 200];

/** The border marks of lines on `xs` and `ys` with the given borders and bands. */
const markBorders = (
	borders: readonly BoundingBox[],
	crossableBands: readonly BoundingBox[],
): ((x: number, y: number) => { sidesH: number; nearH: number }) => {
	const lines = createRouteLines(
		toGridLines(xs),
		toGridLines(ys),
		borders,
		MARGIN,
		crossableBands,
	);
	const marks = lines.borders as BorderMarks;
	return (x, y) => {
		const point = pointIndex(
			lines,
			indexOfGridLine(lines.xs, x),
			indexOfGridLine(lines.ys, y),
		);
		return { sidesH: marks.sidesH[point], nearH: marks.nearH[point] };
	};
};

describe("createRouteLines", () => {
	describe("counting a crossable band's sides", () => {
		// A frame and the title band along its top: the band's top lies on the frame's.
		const frame = { left: 0, top: 0, right: 200, bottom: 200 };
		const titleBand = { left: 0, top: 0, right: 200, bottom: 30 };

		it("counts a side a border's side lies on once", () => {
			const marksAt = markBorders([frame], [titleBand]);

			expect(marksAt(100, 0)).toEqual({ sidesH: 1, nearH: 1 });
		});

		it("counts the band's other side as a border's side", () => {
			const marksAt = markBorders([frame], [titleBand]);

			expect(marksAt(100, 30)).toEqual({ sidesH: 1, nearH: 1 });
		});

		it("counts both sides of a band no border lies on, its corners left out", () => {
			const marksAt = markBorders([], [titleBand]);

			expect(marksAt(100, 0).sidesH).toBe(1);
			expect(marksAt(100, 30).sidesH).toBe(1);
			expect(marksAt(0, 0).sidesH).toBe(0);
			expect(marksAt(200, 30).sidesH).toBe(0);
		});
	});
});
