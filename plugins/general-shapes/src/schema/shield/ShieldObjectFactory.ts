import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { SHIELD_DOC_DEFAULTS } from "./ShieldDoc";

/** Factory for creating Shield shapes (Frame-family shared logic generated from defaults). */
export const ShieldObjectFactory =
	createFrameObjectFactory(SHIELD_DOC_DEFAULTS);
