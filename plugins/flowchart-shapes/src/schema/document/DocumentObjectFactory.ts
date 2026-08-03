import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { DOCUMENT_DOC_DEFAULTS } from "./DocumentDoc";

/** Factory for creating Document shapes (Frame-family shared logic generated from defaults). */
export const DocumentObjectFactory = createFrameObjectFactory(
	DOCUMENT_DOC_DEFAULTS,
);
