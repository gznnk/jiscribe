import { createFrameMapper } from "@workspace/canvas/unstable";

import type { HexagonState } from "./HexagonState";
import type { HexagonDoc } from "../../schema/hexagon/HexagonDoc";
import { HexagonFeatures } from "../../schema/hexagon/HexagonDoc";

/** HexagonDoc ↔ HexagonState conversion (Frame-family shared logic generated from features). */
export const { toState: hexagonToState, toDoc: hexagonToDoc } =
	createFrameMapper<HexagonDoc, HexagonState>(HexagonFeatures);
