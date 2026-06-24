import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { AUTO_COLOR } from "../../utils/autoColor";

const POLY_STROKE = AUTO_COLOR;
const POLY_STROKE_WIDTH = 2;
// polyline のデフォルト半幅（左右対称の水平 2 点線）
const POLYLINE_HALF_WIDTH = 80;

export const PolylineShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		return {
			type: "polyline",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			...overrides,
			// id と幾何（points）は factory が決める。overrides では上書きさせない。
			id: crypto.randomUUID(),
			points: [
				{ x: position.x - POLYLINE_HALF_WIDTH, y: position.y },
				{ x: position.x + POLYLINE_HALF_WIDTH, y: position.y },
			],
		} as ObjectDoc;
	},

	calcDimensions() {
		return { halfWidth: POLYLINE_HALF_WIDTH, halfHeight: 0 };
	},

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize = 5) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < minSize) {
			return null;
		}
		return {
			type: "polyline",
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			...overrides,
			// id と幾何（points）は factory が決める。overrides では上書きさせない。
			id: crypto.randomUUID(),
			points: [
				{ x: x1, y: y1 },
				{ x: x2, y: y2 },
			],
		} as ObjectDoc;
	},
};
