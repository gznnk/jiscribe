import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { TerminalWindowFeatures } from "./TerminalWindowDoc";

/** Validates a TerminalWindowDoc (Frame-family shared logic generated from features). */
export const validateTerminalWindowDoc: ObjectDocValidateFn =
	createFrameDocValidator(TerminalWindowFeatures);
