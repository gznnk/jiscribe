import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk";
import { sampleEllipseArc } from "@jiscribe/geometry";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * Delay outline (centered): rectangle whose right edge bulges out over the full
 * height, so the bulge is half the height deep vertically and no deeper than the
 * width horizontally. Renderer draws the equivalent arc (buildDelayPath).
 */
export const delayOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const ry = halfHeight;
	const rx = Math.min(width, ry);
	return [
		{ x: -halfWidth, y: -halfHeight },
		{ x: halfWidth - rx, y: -halfHeight },
		// right bulge (top to bottom, bulging right)
		...sampleEllipseArc(
			halfWidth - rx,
			0,
			rx,
			ry,
			-90,
			90,
			OUTLINE_CURVE_SEGMENTS,
		),
		{ x: -halfWidth, y: halfHeight },
	];
};
