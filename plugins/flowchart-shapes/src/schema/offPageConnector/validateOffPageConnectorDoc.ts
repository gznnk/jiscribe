import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { OffPageConnectorFeatures } from "./OffPageConnectorDoc";

/** Validates an OffPageConnectorDoc (Frame-family shared logic generated from features). */
export const validateOffPageConnectorDoc: ObjectDocValidateFn =
	createFrameDocValidator(OffPageConnectorFeatures);
