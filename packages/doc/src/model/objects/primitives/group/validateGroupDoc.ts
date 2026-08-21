import { GroupFeatures } from "./GroupDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/**
 * Validates a GroupDoc (generated from features: geometry "none" + transform).
 * Array validation and recursive processing of children is done in validateStructure.ts.
 *
 * Note: GroupDoc carries no frame (cx/cy/width/height) — the frame is derived
 * from the children on load (CanvasMapper → calculateGroupOrientedBounds),
 * where it is clamped to MIN_GROUP_DIMENSION. A `.jis.json` file therefore
 * cannot inject a zero-size group frame, so there is nothing to validate here.
 */
export const validateGroupDoc: ObjectDocValidateFn =
	createFrameDocValidator(GroupFeatures);
