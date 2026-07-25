import { isObject } from "@workspace/basic-validators";

import { isPoint } from "./isPoint";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";

/** Type guard for {@link FrameKeyPoints}. All eight points must be present and valid. */
export const isFrameKeyPoints = (value: unknown): value is FrameKeyPoints => {
	if (!isObject(value)) {
		return false;
	}

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
