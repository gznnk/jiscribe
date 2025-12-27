import type { PointData } from "../../../types/data/core/PointData";

/**
 * Default point geometry data template.
 * Used for State to Data conversion mapping.
 */
export const PointDefaultData = {
	x: 0,
	y: 0,
} as const satisfies PointData;
