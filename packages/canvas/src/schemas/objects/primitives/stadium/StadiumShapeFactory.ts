import { STADIUM_DOC_DEFAULTS } from "./StadiumDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Stadium shapes (Frame-family shared logic generated from defaults). */
export const StadiumShapeFactory =
	createFrameShapeFactory(STADIUM_DOC_DEFAULTS);
