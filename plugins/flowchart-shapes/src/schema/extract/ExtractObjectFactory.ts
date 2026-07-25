import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { EXTRACT_DOC_DEFAULTS } from "./ExtractDoc";

/** Factory for creating Extract shapes (Frame-family shared logic generated from defaults). */
export const ExtractObjectFactory =
	createFrameObjectFactory(EXTRACT_DOC_DEFAULTS);
