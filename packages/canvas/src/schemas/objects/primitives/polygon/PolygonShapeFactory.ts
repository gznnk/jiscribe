import { roundToDecimal } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";

import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { AUTO_COLOR } from "../../utils/autoColor";

const POLY_STROKE = AUTO_COLOR;
const POLY_STROKE_WIDTH = 2;
// Default circumscribed-circle radius and vertex count for a polygon
const POLYGON_RADIUS = 60;
const POLYGON_SIDES = 5;

/**
 * Generates the vertices of a regular polygon inscribed in the circumscribed
 * ellipse with center (cx, cy) and radii (rx, ry). The first vertex is placed
 * straight up (-90°). Shared by createDoc and createDocFromBounds.
 */
const buildPolygonPoints = (
	cx: number,
	cy: number,
	rx: number,
	ry: number,
): Point[] =>
	Array.from({ length: POLYGON_SIDES }, (_, i) => {
		const angle = (2 * Math.PI * i) / POLYGON_SIDES - Math.PI / 2;
		return {
			x: roundToDecimal(cx + rx * Math.cos(angle), 4),
			y: roundToDecimal(cy + ry * Math.sin(angle), 4),
		};
	});

/**
 * Shape factory for regular-polygon objects. Produces docs whose geometry is a
 * list of vertices inscribed in a circumscribed ellipse.
 */
export const PolygonShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		return {
			type: "polygon",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			fill: "transparent",
			...overrides,
			// The id and geometry (points) are decided by the factory; not overridable via overrides.
			id: crypto.randomUUID(),
			points: buildPolygonPoints(
				position.x,
				position.y,
				POLYGON_RADIUS,
				POLYGON_RADIUS,
			),
		} as ObjectDoc;
	},

	calcDimensions() {
		return { halfWidth: POLYGON_RADIUS, halfHeight: POLYGON_RADIUS };
	},

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize = 5) {
		const width = Math.abs(x2 - x1);
		const height = Math.abs(y2 - y1);
		if (width < minSize || height < minSize) {
			return null;
		}
		return {
			type: "polygon",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			fill: "transparent",
			...overrides,
			// The id and geometry (points) are decided by the factory; not overridable via overrides.
			id: crypto.randomUUID(),
			points: buildPolygonPoints(
				(x1 + x2) / 2,
				(y1 + y2) / 2,
				width / 2,
				height / 2,
			),
		} as ObjectDoc;
	},
};
