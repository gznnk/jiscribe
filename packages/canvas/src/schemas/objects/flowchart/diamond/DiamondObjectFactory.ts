import { DIAMOND_DOC_DEFAULTS } from "./DiamondDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Diamond shapes (Frame-family shared logic generated from defaults). */
export const DiamondObjectFactory =
	createFrameObjectFactory(DIAMOND_DOC_DEFAULTS);
