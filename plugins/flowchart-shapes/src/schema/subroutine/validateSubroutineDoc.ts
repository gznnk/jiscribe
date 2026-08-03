import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { SubroutineFeatures } from "./SubroutineDoc";

/** Validates a SubroutineDoc (Frame-family shared logic generated from features). */
export const validateSubroutineDoc: ObjectDocValidateFn =
	createFrameDocValidator(SubroutineFeatures);
