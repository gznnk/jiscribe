import { StadiumFeatures } from "./StadiumDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a StadiumDoc (Frame-family shared logic generated from features). */
export const validateStadiumDoc: ObjectDocValidateFn =
	createFrameDocValidator(StadiumFeatures);
