import type { ObjectDoc } from "../base/ObjectDoc";
import { ELLIPSE_DOC_DEFAULTS } from "../primitives/EllipseDoc";
import { RECT_DOC_DEFAULTS } from "../primitives/RectDoc";

/**
 * 描画ドラッグの開始点・終点からオブジェクト Doc を生成する。
 * 最小サイズ未満の場合は null を返す。
 */
export const createObjectDocFromBounds = (
	type: "rect" | "ellipse",
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	minSize = 5,
): ObjectDoc | null => {
	const width = Math.abs(x2 - x1);
	const height = Math.abs(y2 - y1);

	if (width < minSize || height < minSize) {
		return null;
	}

	const id = crypto.randomUUID();

	if (type === "rect") {
		return {
			...RECT_DOC_DEFAULTS,
			id,
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width,
			height,
		} as ObjectDoc;
	}

	return {
		...ELLIPSE_DOC_DEFAULTS,
		id,
		cx: (x1 + x2) / 2,
		cy: (y1 + y2) / 2,
		rx: width / 2,
		ry: height / 2,
	} as ObjectDoc;
};
