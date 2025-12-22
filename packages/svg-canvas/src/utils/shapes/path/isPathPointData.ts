import type { PathPointData } from "../../../types/data/shapes/PathPointData";
import { isDiagramBaseData } from "../../validation/isDiagramBaseData";

/**
 * Type guard to check if data is PathPointData.
 *
 * @param data - The data to check
 * @returns True if the data is PathPointData
 */
export const isPathPointData = (data: unknown): data is PathPointData => {
	if (!isDiagramBaseData(data)) return false;
	return data.type === "PathPoint";
};
