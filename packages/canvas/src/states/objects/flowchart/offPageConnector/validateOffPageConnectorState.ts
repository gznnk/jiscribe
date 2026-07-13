import { OffPageConnectorFeatures } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates OffPageConnectorState (Frame-family common logic generated from features). */
export const isValidOffPageConnectorState: ObjectStateValidateFn =
	createFrameStateValidator(OffPageConnectorFeatures);
