import { EXTRACT_DOC_DEFAULTS } from "./ExtractDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Extract shapes (Frame-family shared logic generated from defaults). */
export const ExtractShapeFactory =
	createFrameShapeFactory(EXTRACT_DOC_DEFAULTS);
