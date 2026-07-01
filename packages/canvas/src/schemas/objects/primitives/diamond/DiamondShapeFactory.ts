import { DIAMOND_DOC_DEFAULTS } from "./DiamondDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Diamond shapes (Frame-family shared logic generated from defaults). */
export const DiamondShapeFactory =
	createFrameShapeFactory(DIAMOND_DOC_DEFAULTS);
