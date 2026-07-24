import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { ExtractFeatures } from "../../schema/extract/ExtractDoc";

/** Validates ExtractState (Frame-family common logic generated from features). */
export const isValidExtractState: ObjectStateValidator =
	createFrameStateValidator(ExtractFeatures);
