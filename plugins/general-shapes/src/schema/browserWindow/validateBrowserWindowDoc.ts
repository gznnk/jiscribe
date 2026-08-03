import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { BrowserWindowFeatures } from "./BrowserWindowDoc";

/** Validates a BrowserWindowDoc (Frame-family shared logic generated from features). */
export const validateBrowserWindowDoc: ObjectDocValidateFn =
	createFrameDocValidator(BrowserWindowFeatures);
