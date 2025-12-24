import { isNumber, isObject, isString } from "@workspace/basic-validators";

import type { DiagramBaseData } from "../../types/data/core/DiagramBaseData";

/**
 * Check if data has valid diagram base properties (DiagramBaseData).
 * Required: id, type, x, y
 * Optional: name, description
 */
export const isDiagramBaseData = (data: unknown): data is DiagramBaseData => {
	if (!isObject(data)) return false;

	// Required properties
	if (!("id" in data) || !isString(data.id)) return false;
	if (!("type" in data) || !isString(data.type)) return false;
	if (!("x" in data) || !isNumber(data.x)) return false;
	if (!("y" in data) || !isNumber(data.y)) return false;

	// Optional properties (if present, must be valid)
	if ("name" in data && data.name !== undefined && !isString(data.name)) {
		return false;
	}

	if (
		"description" in data &&
		data.description !== undefined &&
		!isString(data.description)
	) {
		return false;
	}

	return true;
};
