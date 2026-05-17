import type { ObjectDoc } from "../base/ObjectDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../primitives/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../primitives/RectDoc";

const POLY_STROKE = "#374151";
const POLY_STROKE_WIDTH = 2;

/**
 * 描画ドラッグの開始点・終点からオブジェクト Doc を生成する。
 * 最小サイズ未満の場合は null を返す。
 */
export const createObjectDocFromBounds = (
	type: "rect" | "ellipse" | "polyline",
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	overrides?: Record<string, unknown>,
	minSize = 5,
): ObjectDoc | null => {
	const id = crypto.randomUUID();

	if (type === "polyline") {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < minSize) {
			return null;
		}
		return {
			type: "polyline",
			id,
			points: [
				{ x: x1, y: y1 },
				{ x: x2, y: y2 },
			],
			stroke: POLY_STROKE,
			strokeWidth: POLY_STROKE_WIDTH,
			...overrides,
		} as ObjectDoc;
	}

	const width = Math.abs(x2 - x1);
	const height = Math.abs(y2 - y1);

	if (width < minSize || height < minSize) {
		return null;
	}

	if (type === "rect") {
		return {
			...RECT_DOC_DEFAULTS,
			...overrides,
			id,
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width,
			height,
		} as ObjectDoc;
	}

	return {
		...ELLIPSE_DOC_DEFAULTS,
		...overrides,
		id,
		cx: (x1 + x2) / 2,
		cy: (y1 + y2) / 2,
		rx: width / 2,
		ry: height / 2,
	} as ObjectDoc;
};
