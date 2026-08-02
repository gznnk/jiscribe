import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { SmartphoneFeatures } from "../../schema/smartphone/SmartphoneDoc";

/** Validates SmartphoneState (Frame-family common logic generated from features). */
export const isValidSmartphoneState: ObjectStateValidator =
	createFrameStateValidator(SmartphoneFeatures);
