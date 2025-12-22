import type { PathData } from "../../../types/data/shapes/PathData";
import { PathFeatures } from "../../../types/data/shapes/PathData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";
import { isArrowHeadType } from "../../validation/isArrowHeadType";
import { isPathType } from "../../validation/isPathType";

const baseValidator = createValidatorFromTypeAndFeatures("Path", PathFeatures);

/**
 * Type guard to check if data is PathData.
 *
 * @param data - The data to check
 * @returns True if the data is PathData
 */
export const isPathData = (data: unknown): data is PathData => {
	if (!baseValidator(data)) return false;

	const pathData = data as PathData;

	if (!isPathType(pathData.pathType)) return false;

	if (pathData.startArrowHead && !isArrowHeadType(pathData.startArrowHead)) {
		return false;
	}

	if (pathData.endArrowHead && !isArrowHeadType(pathData.endArrowHead)) {
		return false;
	}

	return true;
};
