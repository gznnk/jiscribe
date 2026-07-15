import { sampleQuadraticBezier, type Point } from "@workspace/geometry";

import { DOCUMENT_WAVE_RATIO } from "../../../../schemas/objects/flowchart/document/DocumentDoc";
import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Document outline (centered): rectangle with a wavy bottom edge (two quadratic
 * Béziers). `.slice(1)` drops each segment's start point (already emitted).
 * Renderer draws the equivalent path (buildDocumentPath).
 */
export const documentOutline: ShapeOutlineProvider = ({ width, height }) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const amplitude = height * DOCUMENT_WAVE_RATIO;
	const waveY = halfHeight - amplitude;
	const rightWave: Point = { x: halfWidth, y: waveY };
	const midWave: Point = { x: 0, y: waveY };
	const leftWave: Point = { x: -halfWidth, y: waveY };
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth, y: -halfHeight },
		rightWave,
		...sampleQuadraticBezier(
			rightWave,
			{ x: halfWidth * 0.5, y: waveY + amplitude * 2 },
			midWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleQuadraticBezier(
			midWave,
			{ x: -halfWidth * 0.5, y: waveY - amplitude * 2 },
			leftWave,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
	];
};
