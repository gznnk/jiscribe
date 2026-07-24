import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { DiamondFeatures } from "../../schema/diamond/DiamondDoc";

/** Validates DiamondState (Frame-family common logic generated from features). */
export const isValidDiamondState: ObjectStateValidator =
	createFrameStateValidator(DiamondFeatures);
