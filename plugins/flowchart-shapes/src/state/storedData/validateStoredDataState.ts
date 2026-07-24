import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { StoredDataFeatures } from "../../schema/storedData/StoredDataDoc";

/** Validates StoredDataState (Frame-family common logic generated from features). */
export const isValidStoredDataState: ObjectStateValidator =
	createFrameStateValidator(StoredDataFeatures);
