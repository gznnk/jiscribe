import type { TransformativeData } from "../../../types/data/core/TransformativeData";

/**
 * Default transformative data template.
 * Used for State to Data conversion mapping.
 */
export const TransformativeDefaultData = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	keepProportion: false,
	rotateEnabled: true,
	inversionEnabled: true,
} as const satisfies TransformativeData;
