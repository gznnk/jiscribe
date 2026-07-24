import { DiamondFeatures } from "../../../../schemas/objects/flowchart/diamond/DiamondDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DiamondState (Frame-family common logic generated from features). */
export const isValidDiamondState: ObjectStateValidator =
	createFrameStateValidator(DiamondFeatures);
