import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { DISPLAY_DOC_DEFAULTS } from "./DisplayDoc";

/** Factory for creating Display shapes (Frame-family shared logic generated from defaults). */
export const DisplayObjectFactory =
	createFrameObjectFactory(DISPLAY_DOC_DEFAULTS);
