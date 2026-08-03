import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { CardFeatures } from "../../schema/card/CardDoc";

/** Validates CardState (Frame-family common logic generated from features). */
export const isValidCardState: ObjectStateValidator =
	createFrameStateValidator(CardFeatures);
