import { isConnectableData } from "./isConnectableData";
import { isCornerRoundableData } from "./isCornerRoundableData";
import { isDiagramBaseData } from "./isDiagramBaseData";
import { isFillableData } from "./isFillableData";
import { isFrameableData } from "./isFrameableData";
import { isOriginableData } from "./isOriginableData";
import { isStrokableData } from "./isStrokableData";
import { isTextableData } from "./isTextableData";
import { isTransformativeData } from "./isTransformativeData";
import type { DiagramFeatures } from "../../types/core/DiagramFeatures";

/**
 * Create a validator function from Type and DiagramFeatures.
 * Returns a boolean-returning validation function.
 */
export const createValidatorFromTypeAndFeatures =
	(type: string, features: DiagramFeatures) =>
	(data: unknown): boolean => {
		if (!isDiagramBaseData(data)) return false;
		if (data.type !== type) return false;

		// Check all required features
		if (features.frameable && !isFrameableData(data)) return false;
		if (features.transformative && !isTransformativeData(data)) return false;
		if (features.connectable && !isConnectableData(data)) return false;
		if (features.strokable && !isStrokableData(data)) return false;
		if (features.fillable && !isFillableData(data)) return false;
		if (features.cornerRoundable && !isCornerRoundableData(data)) return false;
		if (features.textable && !isTextableData(data)) return false;
		if (features.originable && !isOriginableData(data)) return false;

		return true;
	};
