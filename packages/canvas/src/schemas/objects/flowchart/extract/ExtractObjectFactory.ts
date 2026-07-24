import { EXTRACT_DOC_DEFAULTS } from "./ExtractDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Extract shapes (Frame-family shared logic generated from defaults). */
export const ExtractObjectFactory =
	createFrameObjectFactory(EXTRACT_DOC_DEFAULTS);
