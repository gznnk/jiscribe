import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { TrapezoidFeatures } from "./TrapezoidDoc";

/** Validates a TrapezoidDoc (Frame-family shared logic generated from features). */
export const validateTrapezoidDoc: ObjectDocValidateFn =
	createFrameDocValidator(TrapezoidFeatures);
