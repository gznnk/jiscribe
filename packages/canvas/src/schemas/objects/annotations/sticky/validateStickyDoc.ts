import { StickyFeatures } from "./StickyDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a StickyDoc (Frame-family shared logic generated from features). */
export const validateStickyDoc: ObjectDocValidateFn =
	createFrameDocValidator(StickyFeatures);
