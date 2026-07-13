import { OffPageConnectorFeatures } from "./OffPageConnectorDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates an OffPageConnectorDoc (Frame-family shared logic generated from features). */
export const validateOffPageConnectorDoc: ObjectDocValidateFn =
	createFrameDocValidator(OffPageConnectorFeatures);
