import type { Point, Rect } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { DOCUMENT_WAVE_RATIO } from "../../../schema/document/DocumentDoc";
import { calcMultiDocumentSheets } from "../calcMultiDocumentSheets";
import { calcMultiDocumentSilhouette } from "../calcMultiDocumentSilhouette";
import { multiDocumentOutline } from "../multiDocumentOutline";

/**
 * How far inside the sheet the point is: 0 on its edge, negative outside. The
 * bottom edge is the wave, so the room below the point is measured against the
 * wave's height at that x.
 */
const calcDepthInSheet = (point: Point, sheet: Rect): number => {
	const amplitude = sheet.height * DOCUMENT_WAVE_RATIO;
	const waveY = sheet.y + sheet.height - amplitude;
	const midX = sheet.x + sheet.width / 2;
	const isRightHalf = point.x >= midX;
	const t = isRightHalf
		? (2 * (sheet.x + sheet.width - point.x)) / sheet.width
		: (2 * (midX - point.x)) / sheet.width;
	const dip = 4 * amplitude * t * (1 - t);
	return Math.min(
		point.x - sheet.x,
		sheet.x + sheet.width - point.x,
		point.y - sheet.y,
		(isRightHalf ? waveY + dip : waveY - dip) - point.y,
	);
};

const countLineSegments = (width: number, height: number): number =>
	calcMultiDocumentSilhouette(
		-width / 2,
		-height / 2,
		width,
		height,
	).segments.filter(({ kind }) => kind === "line").length;

describe("multi-document silhouette", () => {
	it("stays inside the bounding box at any aspect ratio", () => {
		for (const [width, height] of [
			[140, 100],
			[100, 100],
			[100, 250],
			[100, 400],
		]) {
			for (const point of multiDocumentOutline({ width, height })) {
				expect(Math.abs(point.x)).toBeLessThanOrEqual(width / 2 + 1e-9);
				expect(Math.abs(point.y)).toBeLessThanOrEqual(height / 2 + 1e-9);
			}
		}
	});

	describe("waves clear of each other (140x100)", () => {
		const sheets = calcMultiDocumentSheets(-70, -50, 140, 100);

		it("puts every outline point on the union's edge — inside no sheet, outside all of them", () => {
			for (const point of multiDocumentOutline({ width: 140, height: 100 })) {
				const deepest = Math.max(
					...sheets.map((sheet) => calcDepthInSheet(point, sheet)),
				);
				expect(deepest).toBeCloseTo(0, 9);
			}
		});

		it("drops down the next sheet's right edge between the waves", () => {
			// The staircase and the back sheet's right edge are 6 of these; the
			// other 2 are the drops, one per join.
			expect(countLineSegments(140, 100)).toBe(8);
		});
	});

	describe("waves interleaving (100x250)", () => {
		it("hands one wave to the next where they cross, with no drop between them", () => {
			expect(countLineSegments(100, 250)).toBe(6);
		});
	});
});
