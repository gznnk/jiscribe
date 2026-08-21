import { ELLIPSE_DOC_DEFAULTS } from "./EllipseDoc";
import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ObjectFactory } from "../../types/ObjectFactory";
import { calcDrawBounds } from "../../utils/calcDrawBounds";
import { numberOverride } from "../../utils/numberOverride";

export const EllipseObjectFactory: ObjectFactory = {
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

	createDocFromBounds(x1, y1, x2, y2, overrides, minSize) {
		const bounds = calcDrawBounds(x1, y1, x2, y2, minSize);
		if (bounds === null) {
			return null;
		}
		const rx = bounds.width / 2;
		const ry = bounds.height / 2;
		return {
			...ELLIPSE_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			cx: bounds.left + rx,
			cy: bounds.top + ry,
			rx,
			ry,
		} as ObjectDoc;
	},
};
