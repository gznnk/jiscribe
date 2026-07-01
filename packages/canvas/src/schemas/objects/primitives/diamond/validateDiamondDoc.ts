import { DiamondFeatures } from "./DiamondDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a DiamondDoc (Frame-family shared logic generated from features). */
export const validateDiamondDoc: ObjectDocValidateFn =
	createFrameDocValidator(DiamondFeatures);
