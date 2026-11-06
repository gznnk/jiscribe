import { RectFeatures } from "./RectDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidateFn";
import { createFrameDocValidator } from "../../validators/createFrameDocValidator";

/**
 * Validates a RectDoc (Frame-family shared logic generated from features). Its
 * `height` is optional, a `"body"` rect being sized from its text
 * (supportsAutoHeight).
 */
export const validateRectDoc: ObjectDocValidateFn =
	createFrameDocValidator(RectFeatures);
