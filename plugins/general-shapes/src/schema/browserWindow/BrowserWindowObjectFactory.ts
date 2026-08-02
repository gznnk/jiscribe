import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { BROWSER_WINDOW_DOC_DEFAULTS } from "./BrowserWindowDoc";

/** Factory for creating BrowserWindow shapes (Frame-family shared logic generated from defaults). */
export const BrowserWindowObjectFactory = createFrameObjectFactory(
	BROWSER_WINDOW_DOC_DEFAULTS,
);
