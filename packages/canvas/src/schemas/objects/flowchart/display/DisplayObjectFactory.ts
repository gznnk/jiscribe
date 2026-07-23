import { DISPLAY_DOC_DEFAULTS } from "./DisplayDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Display shapes (Frame-family shared logic generated from defaults). */
export const DisplayObjectFactory =
	createFrameObjectFactory(DISPLAY_DOC_DEFAULTS);
