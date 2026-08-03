import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { StadiumFeatures } from "./StadiumDoc";

/** Validates a StadiumDoc (Frame-family shared logic generated from features). */
export const validateStadiumDoc: ObjectDocValidateFn =
	createFrameDocValidator(StadiumFeatures);
