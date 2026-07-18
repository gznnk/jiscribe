import type { StoredDataState } from "./StoredDataState";
import type { StoredDataDoc } from "../../../../schemas/objects/flowchart/storedData/StoredDataDoc";
import { StoredDataFeatures } from "../../../../schemas/objects/flowchart/storedData/StoredDataDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** StoredDataDoc ↔ StoredDataState conversion (Frame-family shared logic generated from features). */
export const { toState: storedDataToState, toDoc: storedDataToDoc } =
	createFrameMapper<StoredDataDoc, StoredDataState>(StoredDataFeatures);
