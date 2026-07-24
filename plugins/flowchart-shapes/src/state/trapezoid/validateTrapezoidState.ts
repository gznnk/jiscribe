import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { TrapezoidFeatures } from "../../schema/trapezoid/TrapezoidDoc";

/** Validates TrapezoidState (Frame-family common logic generated from features). */
export const isValidTrapezoidState: ObjectStateValidator =
	createFrameStateValidator(TrapezoidFeatures);
