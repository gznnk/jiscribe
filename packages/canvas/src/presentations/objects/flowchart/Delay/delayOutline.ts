import { sampleEllipseArc } from "@workspace/geometry";
import type { Dimensions } from "@workspace/geometry";

import type { OutlineCalculator } from "../../registry/OutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Delay outline (centered): rectangle with a right-side semicircular bulge
 * (radius = height/2). Renderer draws the equivalent arc (buildDelayPath).
 */
export const delayOutline: OutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const r = halfHeight;
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth - r, y: -halfHeight },
		// right semicircle (top to bottom, bulging right)
		...sampleEllipseArc(
			halfWidth - r,
			0,
			r,
			r,
			-90,
			90,
			OUTLINE_CURVE_SEGMENTS,
		),
		{ x: -halfWidth, y: halfHeight },
	];
};
