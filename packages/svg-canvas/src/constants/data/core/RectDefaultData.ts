import type { RectData } from "../../../types/data/core/RectData";

/**
 * Default rectangular geometry data template.
 * Used for State to Data conversion mapping.
 */
export const RectDefaultData = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
} as const satisfies RectData;
