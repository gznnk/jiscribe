import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { DIAMOND_DOC_DEFAULTS } from "./DiamondDoc";

/** Factory for creating Diamond shapes (Frame-family shared logic generated from defaults). */
export const DiamondObjectFactory =
	createFrameObjectFactory(DIAMOND_DOC_DEFAULTS);
