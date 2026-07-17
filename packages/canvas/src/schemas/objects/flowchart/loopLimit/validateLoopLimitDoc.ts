import { LoopLimitFeatures } from "./LoopLimitDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a LoopLimitDoc (Frame-family shared logic generated from features). */
export const validateLoopLimitDoc: ObjectDocValidateFn =
	createFrameDocValidator(LoopLimitFeatures);
