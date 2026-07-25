import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { HEXAGON_DOC_DEFAULTS } from "./HexagonDoc";

/** Factory for creating Hexagon shapes (Frame-family shared logic generated from defaults). */
export const HexagonObjectFactory =
	createFrameObjectFactory(HEXAGON_DOC_DEFAULTS);
