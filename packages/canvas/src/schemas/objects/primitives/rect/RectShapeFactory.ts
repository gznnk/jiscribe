import { RECT_DOC_DEFAULTS } from "./RectDoc";
import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { numberOverride } from "../../types/ShapeFactory";

export const RectShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		const width = numberOverride(overrides?.width, RECT_DOC_DEFAULTS.width);
		const height = numberOverride(overrides?.height, RECT_DOC_DEFAULTS.height);
		return {
			...RECT_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			x: position.x - width / 2,
			y: position.y - height / 2,
		} as ObjectDoc;
	},

	calcDimensions(overrides) {
		return {
			halfWidth: numberOverride(overrides?.width, RECT_DOC_DEFAULTS.width) / 2,
			halfHeight:
				numberOverride(overrides?.height, RECT_DOC_DEFAULTS.height) / 2,
		};
	},

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize = 5) {
		const width = Math.abs(x2 - x1);
		const height = Math.abs(y2 - y1);
		if (width < minSize || height < minSize) {
			return null;
		}
		return {
			...RECT_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width,
			height,
		} as ObjectDoc;
	},
};
