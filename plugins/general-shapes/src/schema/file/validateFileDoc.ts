import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { FileFeatures } from "./FileDoc";

/** Validates a FileDoc (Frame-family shared logic generated from features). */
export const validateFileDoc: ObjectDocValidateFn =
	createFrameDocValidator(FileFeatures);
