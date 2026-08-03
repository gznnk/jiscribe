import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { ServerFeatures } from "./ServerDoc";

/** Validates a ServerDoc (Frame-family shared logic generated from features). */
export const validateServerDoc: ObjectDocValidateFn =
	createFrameDocValidator(ServerFeatures);
