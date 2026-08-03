import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { StickyFeatures } from "../schema/StickyDoc";

/** Validates a StickyState (Frame-family shared logic generated from features). */
export const isValidStickyState: ObjectStateValidator =
	createFrameStateValidator(StickyFeatures);
