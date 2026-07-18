import { CALLOUT_DOC_DEFAULTS } from "./CalloutDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Callout shapes (Frame-family shared logic generated from defaults). */
export const CalloutShapeFactory =
	createFrameShapeFactory(CALLOUT_DOC_DEFAULTS);
