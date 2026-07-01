import { EllipseFeatures } from "./EllipseDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates an EllipseDoc (Frame-family shared logic generated from features). */
export const validateEllipseDoc: ObjectDocValidateFn =
	createFrameDocValidator(EllipseFeatures);
