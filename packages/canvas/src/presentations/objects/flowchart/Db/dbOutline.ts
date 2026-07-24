import { sampleEllipseArc } from "@workspace/geometry";
import type { Dimensions } from "@workspace/geometry";

import { DB_CAP_RATIO } from "../../../../schemas/objects/flowchart/db/DbDoc";
import type { ObjectOutlineCalculator } from "../../registry/ObjectOutlineRegistry";
import { OUTLINE_CURVE_SEGMENTS } from "../../utils/outlineHelpers";

/**
 * Database cylinder outline (centered): elliptical top/bottom caps sampled as a
 * polyline, joined by the straight sides. Renderer draws the equivalent arcs
 * (buildDbPaths); this is the connector-attachment polyline.
 */
export const dbOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const capRy = height * DB_CAP_RATIO;
	const topY = -halfHeight + capRy;
	const bottomY = halfHeight - capRy;
	return [
		// top cap: upper half from left over the top to right
		...sampleEllipseArc(
			0,
			topY,
			halfWidth,
			capRy,
			180,
			360,
			OUTLINE_CURVE_SEGMENTS,
		),
		// bottom cap: lower half from right under the bottom to left
		...sampleEllipseArc(
			0,
			bottomY,
			halfWidth,
			capRy,
			0,
			180,
			OUTLINE_CURVE_SEGMENTS,
		),
	];
};
