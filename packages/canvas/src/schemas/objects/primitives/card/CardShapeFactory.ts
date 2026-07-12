import { CARD_DOC_DEFAULTS } from "./CardDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Card shapes (Frame-family shared logic generated from defaults). */
export const CardShapeFactory = createFrameShapeFactory(CARD_DOC_DEFAULTS);
