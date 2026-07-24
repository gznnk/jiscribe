import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { SubroutineFeatures } from "../../schema/subroutine/SubroutineDoc";

/** Validates SubroutineState (Frame-family common logic generated from features). */
export const isValidSubroutineState: ObjectStateValidator =
	createFrameStateValidator(SubroutineFeatures);
