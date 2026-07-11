import { ParallelogramFeatures } from "./ParallelogramDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a ParallelogramDoc (Frame-family shared logic generated from features). */
export const validateParallelogramDoc: ObjectDocValidateFn =
	createFrameDocValidator(ParallelogramFeatures);
