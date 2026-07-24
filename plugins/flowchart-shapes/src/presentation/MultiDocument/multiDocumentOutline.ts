import type { ObjectOutlineCalculator } from "@workspace/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@workspace/canvas/unstable";
import {
	sampleQuadraticBezier,
	type Dimensions,
	type Point,
	type Rect,
} from "@workspace/geometry";

import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import { DOCUMENT_WAVE_RATIO } from "../../schema/document/DocumentDoc";

/** Segments for the short exposed wave arcs (one offset wide, a fraction of a half-wave). */
const EXPOSED_WAVE_SEGMENTS = 4;

/**
 * Samples the exposed start of a sheet's bottom-wave right half — the part not
 * hidden behind the sheet stacked in front (one offset in width, measured from
 * the sheet's right edge). The wave's control point sits midway in x, so x(t)
 * is linear in t and the span maps to t ∈ [0, 2·exposedWidth / sheetWidth].
 */
const sampleExposedWave = (sheet: Rect, exposedWidth: number): Point[] => {
	const amplitude = sheet.height * DOCUMENT_WAVE_RATIO;
	const waveY = sheet.y + sheet.height - amplitude;
	const midX = sheet.x + sheet.width / 2;
	return sampleQuadraticBezier(
		{ x: sheet.x + sheet.width, y: waveY },
		{ x: midX + sheet.width * 0.25, y: waveY + amplitude * 2 },
		{ x: midX, y: waveY },
		EXPOSED_WAVE_SEGMENTS,
		0,
		Math.min(1, (2 * exposedWidth) / sheet.width),
	);
};

/**
 * Multi-document outline (centered): the union silhouette of the three stacked
 * sheets — a staircase along the back sheets' top-left corners, then down the
 * right side following each back sheet's wave curve for its exposed offset
 * before dropping to the next sheet's wave line, and finally the front sheet's
 * full wave (two quadratic Béziers, same construction as documentOutline).
 */
export const multiDocumentOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const [backSheet, middleSheet, frontSheet] = calcMultiDocumentSheets(
		-width / 2,
		-height / 2,
		width,
		height,
	);
	const offset = middleSheet.x - frontSheet.x;
	const amplitude = frontSheet.height * DOCUMENT_WAVE_RATIO;
	const frontWaveY = frontSheet.y + frontSheet.height - amplitude;
	const frontRight = frontSheet.x + frontSheet.width;
	const frontMidX = frontSheet.x + frontSheet.width / 2;
	const rightWave: Point = { x: frontRight, y: frontWaveY };
	const midWave: Point = { x: frontMidX, y: frontWaveY };
	const leftWave: Point = { x: frontSheet.x, y: frontWaveY };
	return [
		{ x: frontSheet.x, y: frontSheet.y },
		{ x: middleSheet.x, y: frontSheet.y },
		{ x: middleSheet.x, y: middleSheet.y },
		{ x: backSheet.x, y: middleSheet.y },
		{ x: backSheet.x, y: backSheet.y },
		{ x: backSheet.x + backSheet.width, y: backSheet.y },
		// exposed wave arcs of the back and middle sheets; each starts at that
		// sheet's right-edge wave baseline, and the segment joining them (same x)
		// is the vertical drop along the next sheet's right edge
		...sampleExposedWave(backSheet, offset),
		...sampleExposedWave(middleSheet, offset),
		rightWave,
		...sampleQuadraticBezier(
			rightWave,
			{
				x: frontMidX + frontSheet.width * 0.25,
				y: frontWaveY + amplitude * 2,
			},
			midWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleQuadraticBezier(
			midWave,
			{
				x: frontMidX - frontSheet.width * 0.25,
				y: frontWaveY - amplitude * 2,
			},
			leftWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
	];
};
