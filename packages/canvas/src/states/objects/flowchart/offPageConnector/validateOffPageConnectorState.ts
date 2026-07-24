import { OffPageConnectorFeatures } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates OffPageConnectorState (Frame-family common logic generated from features). */
export const isValidOffPageConnectorState: ObjectStateValidator =
	createFrameStateValidator(OffPageConnectorFeatures);
