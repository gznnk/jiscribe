import { ELLIPSE_DOC_DEFAULTS } from "./EllipseDoc";
import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { numberOverride } from "../../types/ShapeFactory";

export const EllipseShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		return {
			...ELLIPSE_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			cx: position.x,
			cy: position.y,
		} as ObjectDoc;
	},

	calcDimensions(overrides) {
		return {
			halfWidth: numberOverride(overrides?.rx, ELLIPSE_DOC_DEFAULTS.rx),
			halfHeight: numberOverride(overrides?.ry, ELLIPSE_DOC_DEFAULTS.ry),
		};
	},

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize = 5) {
		const width = Math.abs(x2 - x1);
		const height = Math.abs(y2 - y1);
		if (width < minSize || height < minSize) {
			return null;
		}
		return {
			...ELLIPSE_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			cx: (x1 + x2) / 2,
			cy: (y1 + y2) / 2,
			rx: width / 2,
			ry: height / 2,
		} as ObjectDoc;
	},
};
