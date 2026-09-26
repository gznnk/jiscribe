import { EllipseFeatures } from "./EllipseDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidateFn";
import { createFrameDocValidator } from "../../validators/createFrameDocValidator";

/** Validates an EllipseDoc (Frame-family shared logic generated from features). */
export const validateEllipseDoc: ObjectDocValidateFn =
	createFrameDocValidator(EllipseFeatures);
