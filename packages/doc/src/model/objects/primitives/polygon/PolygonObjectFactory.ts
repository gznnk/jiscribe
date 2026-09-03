import { roundToDecimal } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import { POLYGON_DOC_DEFAULTS } from "./PolygonDoc";
import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { calcDrawBounds } from "../../utils/calcDrawBounds";

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
export const PolygonObjectFactory: ObjectFactory = {
	createDoc(position, overrides) {
		// Cloned because defaults and overrides are module-level constants (stencil
		// presets): a nested value shared between two created objects would let an
		// in-place edit of one rewrite the other (same rule as createFrameObjectFactory).
		return structuredClone({
			...POLYGON_DOC_DEFAULTS,
			...overrides,
			// The id and geometry (points) are decided by the factory; not overridable via overrides.
			id: crypto.randomUUID(),
			points: buildPolygonPoints(
				position.x,
				position.y,
				POLYGON_RADIUS,
				POLYGON_RADIUS,
			),
		} as ObjectDoc);
	},

	calcDimensions() {
		return { halfWidth: POLYGON_RADIUS, halfHeight: POLYGON_RADIUS };
	},

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize) {
		const bounds = calcDrawBounds(x1, y1, x2, y2, minSize);
		if (bounds === null) {
			return null;
		}
		const rx = bounds.width / 2;
		const ry = bounds.height / 2;
		// Cloned for the same reason as in createDoc.
		return structuredClone({
			...POLYGON_DOC_DEFAULTS,
			...overrides,
			// The id and geometry (points) are decided by the factory; not overridable via overrides.
			id: crypto.randomUUID(),
			points: buildPolygonPoints(bounds.left + rx, bounds.top + ry, rx, ry),
		} as ObjectDoc);
	},
};
