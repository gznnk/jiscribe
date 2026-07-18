import {
	sampleCubicBezier,
	type Dimensions,
	type Point,
} from "@workspace/geometry";

import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Cloud outline (centered): six cubic Béziers over the unit box (bumpy
 * silhouette). `.slice(1)` drops each segment's start point (already emitted).
 * Renderer draws the equivalent path (buildCloudPath).
 */
export const cloudOutline: ShapeOutlineProvider<Dimensions> = ({
	width,
	height,
}) => {
	const p = (u: number, v: number): Point => ({
		x: width * (u - 0.5),
		y: height * (v - 0.5),
	});
	const a0 = p(0.25, 0.25);
	const a1 = p(0.16, 0.55);
	const a2 = p(0.31, 0.8);
	const a3 = p(0.8, 0.8);
	const a4 = p(0.875, 0.5);
	const a5 = p(0.625, 0.2);
	return [
		...sampleCubicBezier(
			a0,
			p(0.05, 0.25),
			p(0, 0.5),
			a1,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleCubicBezier(
			a1,
			p(0, 0.66),
			p(0.18, 0.9),
			a2,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleCubicBezier(
			a2,
			p(0.4, 1),
			p(0.7, 1),
			a3,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleCubicBezier(
			a3,
			p(1, 0.8),
			p(1, 0.6),
			a4,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleCubicBezier(
			a4,
			p(1, 0.3),
			p(0.8, 0.1),
			a5,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		...sampleCubicBezier(
			a5,
			p(0.5, 0.05),
			p(0.3, 0.05),
			a0,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
	];
};
