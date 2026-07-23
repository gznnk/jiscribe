import { CARD_DOC_DEFAULTS } from "./CardDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Card shapes (Frame-family shared logic generated from defaults). */
export const CardObjectFactory = createFrameObjectFactory(CARD_DOC_DEFAULTS);
