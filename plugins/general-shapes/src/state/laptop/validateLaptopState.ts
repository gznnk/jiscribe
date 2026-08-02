import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { LaptopFeatures } from "../../schema/laptop/LaptopDoc";

/** Validates LaptopState (Frame-family common logic generated from features). */
export const isValidLaptopState: ObjectStateValidator =
	createFrameStateValidator(LaptopFeatures);
