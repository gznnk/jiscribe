import type { ObjectOutlineCalculator } from "@workspace/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@workspace/canvas/unstable";
import { sampleEllipseArc } from "@workspace/geometry";

import { STORED_DATA_CAP_RATIO } from "../../schema/storedData/StoredDataDoc";

/**
 * Stored-data outline (centered): rectangle whose left/right edges are half
 * ellipses both bowing left (right arc concave into the shape, left arc apex
 * on the bounding-box left edge). Renderer draws the equivalent arcs
 * (buildStoredDataPath).
 */
export const storedDataOutline: ObjectOutlineCalculator = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const depth = width * STORED_DATA_CAP_RATIO;
	return [
		{ x: halfWidth, y: -halfHeight },
		// right edge: top to bottom, bowing left through the arc's leftmost point
		...sampleEllipseArc(
			halfWidth,
			0,
			depth,
			halfHeight,
			-90,
			-270,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
		{ x: -halfWidth + depth, y: halfHeight },
		// left edge: bottom to top, bowing left out to the bounding-box edge
		...sampleEllipseArc(
			-halfWidth + depth,
			0,
			depth,
			halfHeight,
			90,
			270,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1),
	];
};
