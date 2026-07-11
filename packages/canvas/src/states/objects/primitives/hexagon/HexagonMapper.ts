import type { HexagonState } from "./HexagonState";
import type { HexagonDoc } from "../../../../schemas/objects/primitives/hexagon/HexagonDoc";
import { HexagonFeatures } from "../../../../schemas/objects/primitives/hexagon/HexagonDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** HexagonDoc ↔ HexagonState conversion (Frame-family shared logic generated from features). */
export const { toState: hexagonToState, toDoc: hexagonToDoc } =
	createFrameMapper<HexagonDoc, HexagonState>(HexagonFeatures);
