import { DISPLAY_DOC_DEFAULTS } from "./DisplayDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Display shapes (Frame-family shared logic generated from defaults). */
export const DisplayShapeFactory =
	createFrameShapeFactory(DISPLAY_DOC_DEFAULTS);
