import { HEXAGON_DOC_DEFAULTS } from "./HexagonDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Hexagon shapes (Frame-family shared logic generated from defaults). */
export const HexagonShapeFactory =
	createFrameShapeFactory(HEXAGON_DOC_DEFAULTS);
