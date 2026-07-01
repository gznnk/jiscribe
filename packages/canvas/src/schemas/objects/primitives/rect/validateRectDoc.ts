import { RectFeatures } from "./RectDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a RectDoc (Frame-family shared logic generated from features). */
export const validateRectDoc: ObjectDocValidateFn =
	createFrameDocValidator(RectFeatures);
