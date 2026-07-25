import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { TrapezoidFeatures } from "./TrapezoidDoc";

/** Validates a TrapezoidDoc (Frame-family shared logic generated from features). */
export const validateTrapezoidDoc: ObjectDocValidateFn =
	createFrameDocValidator(TrapezoidFeatures);
