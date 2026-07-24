import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { HexagonFeatures } from "../../schema/hexagon/HexagonDoc";

/** Validates HexagonState (Frame-family common logic generated from features). */
export const isValidHexagonState: ObjectStateValidator =
	createFrameStateValidator(HexagonFeatures);
