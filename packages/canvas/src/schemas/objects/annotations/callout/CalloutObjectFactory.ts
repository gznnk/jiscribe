import { CALLOUT_DOC_DEFAULTS } from "./CalloutDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Callout shapes (Frame-family shared logic generated from defaults). */
export const CalloutObjectFactory =
	createFrameObjectFactory(CALLOUT_DOC_DEFAULTS);
