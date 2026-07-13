import type { OffPageConnectorState } from "./OffPageConnectorState";
import type { OffPageConnectorDoc } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorFeatures } from "../../../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** OffPageConnectorDoc ↔ OffPageConnectorState conversion (Frame-family shared logic generated from features). */
export const {
	toState: offPageConnectorToState,
	toDoc: offPageConnectorToDoc,
} = createFrameMapper<OffPageConnectorDoc, OffPageConnectorState>(
	OffPageConnectorFeatures,
);
