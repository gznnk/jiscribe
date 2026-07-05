import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { validateTransformFields } from "../../utils/validateDocUtils";

/**
 * Validates a GroupDoc's transform fields; child validation is handled elsewhere.
 *
 * Note: GroupDoc carries no frame (cx/cy/width/height) — the frame is derived
 * from the children on load (CanvasMapper → calculateGroupOrientedBounds),
 * where it is clamped to MIN_GROUP_DIMENSION. A `.jis.json` file therefore
 * cannot inject a zero-size group frame, so there is nothing to validate here.
 */
export const validateGroupDoc: ObjectDocValidateFn = (o, path) => [
	// Array validation and recursive processing of children is done in validateStructure.ts.
	...validateTransformFields(o, path),
];
