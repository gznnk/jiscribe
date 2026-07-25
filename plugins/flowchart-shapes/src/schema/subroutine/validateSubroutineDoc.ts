import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { SubroutineFeatures } from "./SubroutineDoc";

/** Validates a SubroutineDoc (Frame-family shared logic generated from features). */
export const validateSubroutineDoc: ObjectDocValidateFn =
	createFrameDocValidator(SubroutineFeatures);
