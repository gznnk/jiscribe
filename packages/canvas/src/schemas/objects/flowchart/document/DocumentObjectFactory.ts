import { DOCUMENT_DOC_DEFAULTS } from "./DocumentDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Document shapes (Frame-family shared logic generated from defaults). */
export const DocumentObjectFactory = createFrameObjectFactory(
	DOCUMENT_DOC_DEFAULTS,
);
