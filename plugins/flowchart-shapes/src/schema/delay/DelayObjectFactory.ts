import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { DELAY_DOC_DEFAULTS } from "./DelayDoc";

/** Factory for creating Delay shapes (Frame-family shared logic generated from defaults). */
export const DelayObjectFactory = createFrameObjectFactory(DELAY_DOC_DEFAULTS);
