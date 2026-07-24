import { createFrameMapper } from "@workspace/canvas/unstable";

import type { StoredDataState } from "./StoredDataState";
import type { StoredDataDoc } from "../../schema/storedData/StoredDataDoc";
import { StoredDataFeatures } from "../../schema/storedData/StoredDataDoc";

/** StoredDataDoc ↔ StoredDataState conversion (Frame-family shared logic generated from features). */
export const { toState: storedDataToState, toDoc: storedDataToDoc } =
	createFrameMapper<StoredDataDoc, StoredDataState>(StoredDataFeatures);
