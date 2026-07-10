import { DbFeatures } from "./DbDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a DbDoc (Frame-family shared logic generated from features). */
export const validateDbDoc: ObjectDocValidateFn =
	createFrameDocValidator(DbFeatures);
