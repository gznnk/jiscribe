import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { BrowserWindowFeatures } from "../../schema/browserWindow/BrowserWindowDoc";

/** Validates BrowserWindowState (Frame-family common logic generated from features). */
export const isValidBrowserWindowState: ObjectStateValidator =
	createFrameStateValidator(BrowserWindowFeatures);
