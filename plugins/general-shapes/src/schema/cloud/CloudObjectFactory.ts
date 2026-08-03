import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { CLOUD_DOC_DEFAULTS } from "./CloudDoc";

/** Factory for creating Cloud shapes (Frame-family shared logic generated from defaults). */
export const CloudObjectFactory = createFrameObjectFactory(CLOUD_DOC_DEFAULTS);
