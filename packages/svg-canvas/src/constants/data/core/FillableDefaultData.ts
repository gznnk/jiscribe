import type { FillableData } from "../../../types/data/core/FillableData";

/**
 * Default fillable data template.
 * Used for State to Data conversion mapping.
 */
export const FillableDefaultData = {
	fill: "transparent",
} as const satisfies FillableData;
