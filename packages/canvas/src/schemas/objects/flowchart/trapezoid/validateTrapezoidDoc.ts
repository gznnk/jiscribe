import { TrapezoidFeatures } from "./TrapezoidDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a TrapezoidDoc (Frame-family shared logic generated from features). */
export const validateTrapezoidDoc: ObjectDocValidateFn =
	createFrameDocValidator(TrapezoidFeatures);
