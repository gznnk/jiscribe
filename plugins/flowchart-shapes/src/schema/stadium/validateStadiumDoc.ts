import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { StadiumFeatures } from "./StadiumDoc";

/** Validates a StadiumDoc (Frame-family shared logic generated from features). */
export const validateStadiumDoc: ObjectDocValidateFn =
	createFrameDocValidator(StadiumFeatures);
