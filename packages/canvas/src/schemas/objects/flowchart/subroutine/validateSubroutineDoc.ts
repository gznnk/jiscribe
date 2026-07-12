import { SubroutineFeatures } from "./SubroutineDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a SubroutineDoc (Frame-family shared logic generated from features). */
export const validateSubroutineDoc: ObjectDocValidateFn =
	createFrameDocValidator(SubroutineFeatures);
