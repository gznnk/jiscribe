import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { OffPageConnectorFeatures } from "./OffPageConnectorDoc";

/** Validates an OffPageConnectorDoc (Frame-family shared logic generated from features). */
export const validateOffPageConnectorDoc: ObjectDocValidateFn =
	createFrameDocValidator(OffPageConnectorFeatures);
