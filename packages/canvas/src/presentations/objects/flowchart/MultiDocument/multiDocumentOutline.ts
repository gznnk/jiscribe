import { sampleQuadraticBezier, type Point } from "@workspace/geometry";

import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import { DOCUMENT_WAVE_RATIO } from "../../../../schemas/objects/flowchart/document/DocumentDoc";
import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Multi-document outline (centered): the union silhouette of the three stacked
 * sheets — a staircase along the back sheets' top-left corners, a stepped right
 * side dropping to each sheet's wave line, and the front sheet's wave (two
 * quadratic Béziers, same construction as documentOutline). The right-side
 * steps approximate the back sheets' wave arcs with straight drops.
 */
export const multiDocumentOutline: ShapeOutlineProvider = ({
	width,
	height,
}) => {
	const [backSheet, middleSheet, frontSheet] = calcMultiDocumentSheets(
		-width / 2,
		-height / 2,
		width,
		height,
	);
	const amplitude = frontSheet.height * DOCUMENT_WAVE_RATIO;
	const waveY = (sheet: typeof frontSheet): number =>
		sheet.y + sheet.height - amplitude;
	const frontRight = frontSheet.x + frontSheet.width;
	const frontMidX = frontSheet.x + frontSheet.width / 2;
	const rightWave: Point = { x: frontRight, y: waveY(frontSheet) };
	const midWave: Point = { x: frontMidX, y: waveY(frontSheet) };
	const leftWave: Point = { x: frontSheet.x, y: waveY(frontSheet) };
	return [
		{ x: frontSheet.x, y: frontSheet.y },
		{ x: middleSheet.x, y: frontSheet.y },
		{ x: middleSheet.x, y: middleSheet.y },
		{ x: backSheet.x, y: middleSheet.y },
		{ x: backSheet.x, y: backSheet.y },
		{ x: backSheet.x + backSheet.width, y: backSheet.y },
		{ x: backSheet.x + backSheet.width, y: waveY(backSheet) },
		{ x: middleSheet.x + middleSheet.width, y: waveY(backSheet) },
		{ x: middleSheet.x + middleSheet.width, y: waveY(middleSheet) },
		{ x: frontRight, y: waveY(middleSheet) },
		rightWave,
		...sampleQuadraticBezier(
			rightWave,
			{
				x: frontMidX + frontSheet.width * 0.25,
				y: waveY(frontSheet) + amplitude * 2,
			},
			midWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleQuadraticBezier(
			midWave,
			{
				x: frontMidX - frontSheet.width * 0.25,
				y: waveY(frontSheet) - amplitude * 2,
			},
			leftWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
	];
};
