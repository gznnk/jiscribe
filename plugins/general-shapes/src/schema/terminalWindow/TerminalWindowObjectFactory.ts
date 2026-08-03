import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { TERMINAL_WINDOW_DOC_DEFAULTS } from "./TerminalWindowDoc";

/** Factory for creating TerminalWindow shapes (Frame-family shared logic generated from defaults). */
export const TerminalWindowObjectFactory = createFrameObjectFactory(
	TERMINAL_WINDOW_DOC_DEFAULTS,
);
