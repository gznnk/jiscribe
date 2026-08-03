import { OUTLINE_CURVE_SEGMENTS } from "@workspace/canvas-sdk";
import type { Point } from "@workspace/geometry";
import { sampleEllipseArc } from "@workspace/geometry";

/**
 * Outline of a rounded rectangle, centered on the origin: the four corner arcs
 * in clockwise order, with the straight edges between them left implicit as the
 * polygon edges joining consecutive arcs.
 *
 * Shared by every pictogram whose silhouette is a rounded box. Without it those
 * shapes fall back to the bounding box, which cuts the corner off by about 29%
 * of the radius — small, but it is the corners a diagonal connector aims at.
 *
 * @param width Box width; the outline spans -width/2 .. width/2.
 * @param height Box height.
 * @param radius Corner radius in local px, clamped to half the shorter side to match buildRoundedRectPath.
 * @returns Points in clockwise order starting at the top-right arc; a radius of 0 degenerates to the four corners.
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
