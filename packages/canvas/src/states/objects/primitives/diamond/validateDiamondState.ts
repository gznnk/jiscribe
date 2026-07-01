import { DiamondFeatures } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DiamondState (Frame-family common logic generated from features). */
export const isValidDiamondState: ObjectStateValidateFn =
	createFrameStateValidator(DiamondFeatures);
