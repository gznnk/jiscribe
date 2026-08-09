import type { Point, QuadraticBezier, Rect } from "@jiscribe/geometry";
import { sliceQuadraticBezier } from "@jiscribe/geometry";

import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import { DOCUMENT_WAVE_RATIO } from "../../schema/document/DocumentDoc";

/** One step of a traced outline; it starts where the previous step ended. */
export type SilhouetteSegment =
	| { kind: "line"; to: Point }
	| { kind: "quad"; control: Point; to: Point };

/** A closed outline traced clockwise; the last segment's end joins back to `start`. */
export type MultiDocumentSilhouette = {
	/** Where the trace begins — the front sheet's top-left corner. */
	start: Point;
	/** The steps of the trace, in order. */
	segments: SilhouetteSegment[];
};

/**
 * Two ends of a join count as the same point below this, in the shape's own
 * units. The joins meet exactly, but by two different routes through the wave,
 * so they land a rounding error apart.
 */
const JOIN_EPSILON = 1e-9;

/** Both halves of a sheet's bottom wave, in the direction the outline traces them (right to left). */
const calcWaveHalves = (
	sheet: Rect,
	amplitude: number,
): { right: QuadraticBezier; left: QuadraticBezier } => {
	const waveY = sheet.y + sheet.height - amplitude;
	const midX = sheet.x + sheet.width / 2;
	return {
		right: {
			p0: { x: sheet.x + sheet.width, y: waveY },
			control: { x: midX + sheet.width * 0.25, y: waveY + amplitude * 2 },
			p1: { x: midX, y: waveY },
		},
		left: {
			p0: { x: midX, y: waveY },
			control: { x: midX - sheet.width * 0.25, y: waveY - amplitude * 2 },
			p1: { x: sheet.x, y: waveY },
		},
	};
};

/**
 * Traces the outline of a multi-document whose overall bounding box has its
 * top-left corner at (x, y): the union of the three stacked sheets, so the
 * edges hidden behind a sheet in front are never part of it. The sheets step up
 * and to the right, so every visible edge lands on that union and the whole
 * shape is one closed curve with no interior seams.
 *
 * That holds as long as a wave dips no deeper than the offset between sheets.
 * Past it — portrait boxes from roughly 1.9:1 up, where the wave grows with the
 * sheet height while the offset does not — the sheets' waves interleave, and
 * the trace keeps the front sheet's wave as the bottom edge instead of weaving
 * through every crossing. Connectors then attach to a bottom edge up to a wave
 * offset above the drawn one; the shape itself is drawn sheet by sheet
 * (MultiDocument.tsx) and is unaffected.
 *
 * Feeds the connector outline and the visual bounds derived from it.
 *
 * @param x - Left edge of the overall bounding box, in the object's own coordinates (the renderer passes -width/2)
 * @param y - Top edge of the overall bounding box, in the object's own coordinates (the renderer passes -height/2)
 * @param width - Width of the overall bounding box, covering all three sheets
 * @param height - Height of the overall bounding box, covering all three sheets
 * @returns The trace, clockwise from the front sheet's top-left corner; the closing left edge back to `start` is left implicit
 */
export const calcMultiDocumentSilhouette = (
	x: number,
	y: number,
	width: number,
	height: number,
): MultiDocumentSilhouette => {
	const sheets = calcMultiDocumentSheets(x, y, width, height);
	const [backSheet, middleSheet, frontSheet] = sheets;
	const offset = middleSheet.x - frontSheet.x;
	const sheetWidth = frontSheet.width;
	const amplitude = frontSheet.height * DOCUMENT_WAVE_RATIO;

	// A sheet sits one offset to the right of the one in front of it, which on
	// the wave is a shift of this much in t (x is linear in t along either half).
	const shiftT = (2 * offset) / sheetWidth;
	// Neighbouring waves are the same parabola translated by (-offset, +offset),
	// and a parabola minus its own translate is linear, so they cross exactly
	// once — where 4·amplitude·shiftT·(1 + shiftT - 2t) equals the offset. Up to
	// the crossing the sheet behind dips below the one in front and stays
	// visible; past it, it runs inside the sheet in front and is covered. A
	// crossing at or before shiftT means the waves stay clear of each other and
	// the sheets meet along a right edge instead.
	const crossT = (1 + shiftT - sheetWidth / (8 * amplitude)) / 2;
	/** Where a sheet's wave leaves the sheet stacked behind it; up to here it runs inside that one. */
	const emergeT = Math.max(0, crossT - shiftT);
	/** Where a sheet's wave passes under the sheet stacked in front of it and stops being drawn. */
	const submergeT = Math.max(shiftT, crossT);

	const start: Point = { x: frontSheet.x, y: frontSheet.y };
	const segments: SilhouetteSegment[] = [];
	let current = start;
	const lineTo = (to: Point): void => {
		// The joins between waves land on the same point unless a sheet's right
		// edge shows between them, so only emit a step that actually moves.
		if (
			Math.abs(to.x - current.x) > JOIN_EPSILON ||
			Math.abs(to.y - current.y) > JOIN_EPSILON
		) {
			segments.push({ kind: "line", to });
			current = to;
		}
	};
	const quadTo = (curve: QuadraticBezier): void => {
		segments.push({ kind: "quad", control: curve.control, to: curve.p1 });
		current = curve.p1;
	};

	// The staircase along the back sheets' top-left corners, then the back
	// sheet's top edge and right edge.
	lineTo({ x: middleSheet.x, y: frontSheet.y });
	lineTo({ x: middleSheet.x, y: middleSheet.y });
	lineTo({ x: backSheet.x, y: middleSheet.y });
	lineTo({ x: backSheet.x, y: backSheet.y });
	lineTo({ x: backSheet.x + sheetWidth, y: backSheet.y });

	// Down the right side: each sheet contributes the visible stretch of its
	// wave, joined by whatever shows of the next sheet's right edge.
	sheets.forEach((sheet, index) => {
		const { right } = calcWaveHalves(sheet, amplitude);
		const tStart = index === 0 ? 0 : emergeT;
		const tEnd = index === sheets.length - 1 ? 1 : submergeT;
		const visible = sliceQuadraticBezier(
			right.p0,
			right.control,
			right.p1,
			tStart,
			tEnd,
		);
		lineTo(visible.p0);
		quadTo(visible);
	});

	// The front sheet's wave finishes uncovered.
	quadTo(calcWaveHalves(frontSheet, amplitude).left);

	return { start, segments };
};
