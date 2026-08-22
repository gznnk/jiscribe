import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { AUTO_COLOR } from "../../utils/autoColor";
import { DEFAULT_MIN_DRAW_SIZE } from "../../utils/calcDrawBounds";

const POLY_STROKE = AUTO_COLOR;
const POLY_STROKE_WIDTH = 2;
// Default half-width for a polyline (a symmetric horizontal two-point line)
const POLYLINE_HALF_WIDTH = 80;

/** Shape factory for polyline objects (creation from a position or from drag bounds). */
export const PolylineObjectFactory: ObjectFactory = {
	createDoc(position, overrides) {
		// Cloned because overrides are module-level constants (stencil presets): a
		// nested value shared between two created objects would let an in-place edit
		// of one rewrite the other (same rule as createFrameObjectFactory).
		return structuredClone({
			type: "polyline",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			...overrides,
			// The id and geometry (points) are determined by the factory; overrides cannot replace them.
			id: crypto.randomUUID(),
			points: [
				{ x: position.x - POLYLINE_HALF_WIDTH, y: position.y },
				{ x: position.x + POLYLINE_HALF_WIDTH, y: position.y },
			],
		} as ObjectDoc);
	},

	calcDimensions() {
		return { halfWidth: POLYLINE_HALF_WIDTH, halfHeight: 0 };
	},

	createDocFromBounds(
		x1,
		y1,
		x2,
		y2,
		overrides,
		minSize = DEFAULT_MIN_DRAW_SIZE,
	) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < minSize) {
			return null;
		}
		// Cloned for the same reason as in createDoc.
		return structuredClone({
			type: "polyline",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			...overrides,
			// The id and geometry (points) are determined by the factory; overrides cannot replace them.
			id: crypto.randomUUID(),
			points: [
				{ x: x1, y: y1 },
				{ x: x2, y: y2 },
			],
		} as ObjectDoc);
	},
};
