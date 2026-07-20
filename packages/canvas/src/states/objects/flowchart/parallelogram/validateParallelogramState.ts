import { ParallelogramFeatures } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ParallelogramState (Frame-family common logic generated from features). */
export const isValidParallelogramState: ObjectStateValidator =
	createFrameStateValidator(ParallelogramFeatures);
