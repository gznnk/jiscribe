import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { STADIUM_DOC_DEFAULTS } from "./StadiumDoc";

/** Factory for creating Stadium shapes (Frame-family shared logic generated from defaults). */
export const StadiumObjectFactory =
	createFrameObjectFactory(STADIUM_DOC_DEFAULTS);
