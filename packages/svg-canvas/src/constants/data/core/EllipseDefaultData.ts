import type { EllipseData } from "../../../types/data/core/EllipseData";

/**
 * Default elliptical geometry data template.
 * Used for State to Data conversion mapping.
 */
export const EllipseDefaultData = {
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 50,
} as const satisfies EllipseData;
