import { sampleEllipseArc } from "@workspace/geometry";
import type { Dimensions } from "@workspace/geometry";

import {
	DISPLAY_CAP_RATIO,
	DISPLAY_LEFT_RATIO,
} from "../../../../schemas/objects/flowchart/display/DisplayDoc";
import type { ShapeOutlineProvider } from "../../registry/ShapeOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Display outline (centered): pointed left edge + rounded right cap. Renderer
 * draws the equivalent path (buildDisplayPath).
 */
export const displayOutline: ShapeOutlineProvider<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const leftInset = width * DISPLAY_LEFT_RATIO;
	const capRx = width * DISPLAY_CAP_RATIO;
	return [
		{ x: -halfWidth, y: 0 },
		{ x: -halfWidth + leftInset, y: -halfHeight },
		{ x: halfWidth - capRx, y: -halfHeight },
		// right elliptical cap (top to bottom, bulging right)
		...sampleEllipseArc(
			halfWidth - capRx,
			0,
			capRx,
			halfHeight,
			-90,
			90,
			OUTLINE_CURVE_SEGMENTS,
		),
		{ x: -halfWidth + leftInset, y: halfHeight },
	];
};
