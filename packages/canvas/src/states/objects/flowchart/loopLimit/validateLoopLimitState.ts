import { LoopLimitFeatures } from "../../../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates LoopLimitState (Frame-family common logic generated from features). */
export const isValidLoopLimitState: ObjectStateValidator =
	createFrameStateValidator(LoopLimitFeatures);
