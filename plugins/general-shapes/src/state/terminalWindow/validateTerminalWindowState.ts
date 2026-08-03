import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { TerminalWindowFeatures } from "../../schema/terminalWindow/TerminalWindowDoc";

/** Validates TerminalWindowState (Frame-family common logic generated from features). */
export const isValidTerminalWindowState: ObjectStateValidator =
	createFrameStateValidator(TerminalWindowFeatures);
