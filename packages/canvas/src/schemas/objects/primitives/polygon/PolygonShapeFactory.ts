import { roundToDecimal } from "@workspace/geometry";

import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { AUTO_COLOR } from "../../utils/autoColor";

const POLY_STROKE = AUTO_COLOR;
const POLY_STROKE_WIDTH = 2;
// polygon のデフォルト外接円半径と頂点数
const POLYGON_RADIUS = 60;
const POLYGON_SIDES = 5;

export const PolygonShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		const points = Array.from({ length: POLYGON_SIDES }, (_, i) => {
			const angle = (2 * Math.PI * i) / POLYGON_SIDES - Math.PI / 2;
			return {
				x: roundToDecimal(position.x + POLYGON_RADIUS * Math.cos(angle), 4),
				y: roundToDecimal(position.y + POLYGON_RADIUS * Math.sin(angle), 4),
			};
		});
		return {
			type: "polygon",
			id: crypto.randomUUID(),
			points,
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			fill: "transparent",
			...overrides,
		} as ObjectDoc;
	},

	calcDimensions() {
		return { halfWidth: POLYGON_RADIUS, halfHeight: POLYGON_RADIUS };
	},
	// createDocFromBounds なし: polygon はクリックで中央配置のみ。
};
