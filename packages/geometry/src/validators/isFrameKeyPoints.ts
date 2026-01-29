import { isObject } from "@workspace/basic-validators";

import { isPoint } from "./isPoint";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";

/**
 * Type guard to check if a value is a valid FrameKeyPoints object.
 * Validates that the value has all required point properties (8 points).
 */
export const isFrameKeyPoints = (value: unknown): value is FrameKeyPoints => {
	if (!isObject(value)) return false;

	// Check all required point properties
	const requiredPoints = [
		"topLeft",
		"topCenter",
		"topRight",
		"rightCenter",
		"bottomRight",
		"bottomCenter",
		"bottomLeft",
		"leftCenter",
	] as const;

	for (const pointName of requiredPoints) {
		if (!(pointName in value) || !isPoint(value[pointName])) {
			return false;
		}
	}

	return true;
};
