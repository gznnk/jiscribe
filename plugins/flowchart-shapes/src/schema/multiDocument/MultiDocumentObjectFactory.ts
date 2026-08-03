import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { MULTI_DOCUMENT_DOC_DEFAULTS } from "./MultiDocumentDoc";

/** Factory for creating MultiDocument shapes (Frame-family shared logic generated from defaults). */
export const MultiDocumentObjectFactory = createFrameObjectFactory(
	MULTI_DOCUMENT_DOC_DEFAULTS,
);
