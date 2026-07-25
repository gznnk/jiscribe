import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { CROSS_DOC_DEFAULTS } from "./CrossDoc";

/** Factory for creating Cross shapes (Frame-family shared logic generated from defaults). */
export const CrossObjectFactory = createFrameObjectFactory(CROSS_DOC_DEFAULTS);
