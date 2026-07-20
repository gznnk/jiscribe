import { StoredDataFeatures } from "../../../../schemas/objects/flowchart/storedData/StoredDataDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates StoredDataState (Frame-family common logic generated from features). */
export const isValidStoredDataState: ObjectStateValidator =
	createFrameStateValidator(StoredDataFeatures);
