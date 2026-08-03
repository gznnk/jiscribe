import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { CALLOUT_DOC_DEFAULTS } from "./CalloutDoc";

/** Factory for creating Callout shapes (Frame-family shared logic generated from defaults). */
export const CalloutObjectFactory =
	createFrameObjectFactory(CALLOUT_DOC_DEFAULTS);
