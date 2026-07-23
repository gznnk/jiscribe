import { MULTI_DOCUMENT_DOC_DEFAULTS } from "./MultiDocumentDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating MultiDocument shapes (Frame-family shared logic generated from defaults). */
export const MultiDocumentObjectFactory = createFrameObjectFactory(
	MULTI_DOCUMENT_DOC_DEFAULTS,
);
