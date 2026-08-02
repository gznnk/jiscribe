import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { SMARTPHONE_DOC_DEFAULTS } from "./SmartphoneDoc";

/** Factory for creating Smartphone shapes (Frame-family shared logic generated from defaults). */
export const SmartphoneObjectFactory = createFrameObjectFactory(
	SMARTPHONE_DOC_DEFAULTS,
);
