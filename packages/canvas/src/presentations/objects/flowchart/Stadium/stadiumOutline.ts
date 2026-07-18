import { sampleEllipseArc } from "@workspace/geometry";
import type { Dimensions } from "@workspace/geometry";

import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Stadium outline (centered): fully rounded rectangle (corner radius = half the
 * short side). The straight edges between the four corner arcs are the polygon
 * edges connecting consecutive arcs. Renderer draws `<rect rx>`.
 */
export const stadiumOutline: ShapeOutlineProvider<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const r = Math.min(width, height) / 2;
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
