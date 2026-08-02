import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { TerminalWindowFeatures } from "./TerminalWindowDoc";

/** Validates a TerminalWindowDoc (Frame-family shared logic generated from features). */
export const validateTerminalWindowDoc: ObjectDocValidateFn =
	createFrameDocValidator(TerminalWindowFeatures);
