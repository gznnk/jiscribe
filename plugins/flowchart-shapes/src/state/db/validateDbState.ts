import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { DbFeatures } from "../../schema/db/DbDoc";

/** Validates DbState (Frame-family common logic generated from features). */
export const isValidDbState: ObjectStateValidator =
	createFrameStateValidator(DbFeatures);
