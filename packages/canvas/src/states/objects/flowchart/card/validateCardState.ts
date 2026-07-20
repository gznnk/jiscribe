import { CardFeatures } from "../../../../schemas/objects/flowchart/card/CardDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CardState (Frame-family common logic generated from features). */
export const isValidCardState: ObjectStateValidator =
	createFrameStateValidator(CardFeatures);
