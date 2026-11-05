import type { Point } from "@jiscribe/geometry";
import { sampleEllipseArc } from "@jiscribe/geometry";

import { OUTLINE_CURVE_SEGMENTS } from "./outlineHelpers";

/**
 * Outline of a rounded rectangle, centered on the origin: the four corner arcs
 * in clockwise order, with the straight edges between them left implicit as the
 * polygon edges joining consecutive arcs.
 *
 * @param width Box width; the outline spans -width/2 .. width/2.
 * @param height Box height; the outline spans -height/2 .. height/2.
 * @param radius Corner radius in local px, clamped to half the shorter side (pass that half for a stadium).
 * @returns Points in clockwise order starting at the top-right arc; a radius of 0 degenerates to the four box corners, each repeated.
 */
export const calcRoundedRectOutline = (
	width: number,
	height: number,
	radius: number,
): Point[] => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const r = Math.min(radius, width / 2, height / 2);
	// Half the budget per corner: four quarter-arcs make up one full ellipse.
	const cornerSegments = Math.max(2, Math.round(OUTLINE_CURVE_SEGMENTS / 2));
	return [
		...sampleEllipseArc(
			halfWidth - r,
			-halfHeight + r,
			r,
			r,
			-90,
			0,
			cornerSegments,
		),
		...sampleEllipseArc(
			halfWidth - r,
			halfHeight - r,
			r,
			r,
			0,
			90,
			cornerSegments,
		),
		...sampleEllipseArc(
			-halfWidth + r,
			halfHeight - r,
			r,
			r,
			90,
			180,
			cornerSegments,
		),
		...sampleEllipseArc(
			-halfWidth + r,
			-halfHeight + r,
			r,
			r,
			180,
			270,
			cornerSegments,
		),
	];
};
