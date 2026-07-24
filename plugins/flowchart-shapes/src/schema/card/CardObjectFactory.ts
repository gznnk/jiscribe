import { createFrameObjectFactory } from "@workspace/canvas/unstable";

import { CARD_DOC_DEFAULTS } from "./CardDoc";

/** Factory for creating Card shapes (Frame-family shared logic generated from defaults). */
export const CardObjectFactory = createFrameObjectFactory(CARD_DOC_DEFAULTS);
