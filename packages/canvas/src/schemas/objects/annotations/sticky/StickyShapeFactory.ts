import { STICKY_DOC_DEFAULTS } from "./StickyDoc";
import type { ObjectDoc } from "../../base/ObjectDoc";
import type { ShapeFactory } from "../../types/ShapeFactory";
import { numberOverride } from "../../types/ShapeFactory";

export const StickyShapeFactory: ShapeFactory = {
	createDoc(position, overrides) {
		const width = numberOverride(overrides?.width, STICKY_DOC_DEFAULTS.width);
		const height = numberOverride(
			overrides?.height,
			STICKY_DOC_DEFAULTS.height,
		);
		return {
			...STICKY_DOC_DEFAULTS,
			...overrides,
			id: crypto.randomUUID(),
			x: position.x - width / 2,
			y: position.y - height / 2,
		} as ObjectDoc;
	},

	calcDimensions(overrides) {
		return {
			halfWidth:
				numberOverride(overrides?.width, STICKY_DOC_DEFAULTS.width) / 2,
			halfHeight:
				numberOverride(overrides?.height, STICKY_DOC_DEFAULTS.height) / 2,
		};
	},
	// createDocFromBounds なし: sticky はクリックで中央配置のみ。
};
