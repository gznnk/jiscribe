import { isBoolean, isString } from "@workspace/basic-validators";

import type { ConnectLineData } from "../../../types/data/shapes/ConnectLineData";
import { ConnectLineFeatures } from "../../../types/data/shapes/ConnectLineData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";
import { isArrowHeadType } from "../../validation/isArrowHeadType";
import { isPathType } from "../../validation/isPathType";

const baseValidator = createValidatorFromTypeAndFeatures(
	"ConnectLine",
	ConnectLineFeatures,
);

/**
 * Type guard to check if data is ConnectLineData.
 *
 * @param data - The data to check
 * @returns True if the data is ConnectLineData
 */
export const isConnectLineData = (data: unknown): data is ConnectLineData => {
	if (!baseValidator(data)) return false;

	const lineData = data as ConnectLineData;

	if (!isPathType(lineData.pathType)) return false;
	if (!isString(lineData.startOwnerId)) return false;
	if (!isString(lineData.endOwnerId)) return false;
	if (!isBoolean(lineData.autoRouting)) return false;

	if (lineData.startArrowHead && !isArrowHeadType(lineData.startArrowHead)) {
		return false;
	}

	if (lineData.endArrowHead && !isArrowHeadType(lineData.endArrowHead)) {
		return false;
	}

	return true;
};
