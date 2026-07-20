import { HexagonFeatures } from "../../../../schemas/objects/flowchart/hexagon/HexagonDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates HexagonState (Frame-family common logic generated from features). */
export const isValidHexagonState: ObjectStateValidator =
	createFrameStateValidator(HexagonFeatures);
