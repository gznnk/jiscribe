import { MULTI_DOCUMENT_DOC_DEFAULTS } from "./MultiDocumentDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating MultiDocument shapes (Frame-family shared logic generated from defaults). */
export const MultiDocumentShapeFactory = createFrameShapeFactory(
	MULTI_DOCUMENT_DOC_DEFAULTS,
);
