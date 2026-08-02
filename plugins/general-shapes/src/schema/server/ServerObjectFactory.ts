import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { SERVER_DOC_DEFAULTS } from "./ServerDoc";

/** Factory for creating Server shapes (Frame-family shared logic generated from defaults). */
export const ServerObjectFactory =
	createFrameObjectFactory(SERVER_DOC_DEFAULTS);
