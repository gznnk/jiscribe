import { ParallelogramFeatures } from "../../../../schemas/objects/primitives/parallelogram/ParallelogramDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ParallelogramState (Frame-family common logic generated from features). */
export const isValidParallelogramState: ObjectStateValidateFn =
	createFrameStateValidator(ParallelogramFeatures);
