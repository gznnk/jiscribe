import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { TrapezoidFeatures } from "./TrapezoidDoc";

/** Validates a TrapezoidDoc (Frame-family shared logic generated from features). */
export const validateTrapezoidDoc: ObjectDocValidateFn =
	createFrameDocValidator(TrapezoidFeatures);
