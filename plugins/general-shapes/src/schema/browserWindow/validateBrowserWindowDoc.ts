import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { BrowserWindowFeatures } from "./BrowserWindowDoc";

/** Validates a BrowserWindowDoc (Frame-family shared logic generated from features). */
export const validateBrowserWindowDoc: ObjectDocValidateFn =
	createFrameDocValidator(BrowserWindowFeatures);
