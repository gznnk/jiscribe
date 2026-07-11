import { DOCUMENT_DOC_DEFAULTS } from "./DocumentDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Document shapes (Frame-family shared logic generated from defaults). */
export const DocumentShapeFactory = createFrameShapeFactory(
	DOCUMENT_DOC_DEFAULTS,
);
