import { createFrameMapper } from "@workspace/canvas/unstable";

import type { TerminalWindowState } from "./TerminalWindowState";
import type { TerminalWindowDoc } from "../../schema/terminalWindow/TerminalWindowDoc";
import { TerminalWindowFeatures } from "../../schema/terminalWindow/TerminalWindowDoc";

/** TerminalWindowDoc <-> TerminalWindowState conversion (Frame-family shared logic generated from features). */
export const { toState: terminalWindowToState, toDoc: terminalWindowToDoc } =
	createFrameMapper<TerminalWindowDoc, TerminalWindowState>(
		TerminalWindowFeatures,
	);
