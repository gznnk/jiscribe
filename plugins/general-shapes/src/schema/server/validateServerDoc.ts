import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { ServerFeatures } from "./ServerDoc";

/** Validates a ServerDoc (Frame-family shared logic generated from features). */
export const validateServerDoc: ObjectDocValidateFn =
	createFrameDocValidator(ServerFeatures);
