import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { FileFeatures } from "./FileDoc";

/** Validates a FileDoc (Frame-family shared logic generated from features). */
export const validateFileDoc: ObjectDocValidateFn =
	createFrameDocValidator(FileFeatures);
