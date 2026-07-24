import { createFrameMapper } from "@workspace/canvas/unstable";

import type { OffPageConnectorState } from "./OffPageConnectorState";
import type { OffPageConnectorDoc } from "../../schema/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorFeatures } from "../../schema/offPageConnector/OffPageConnectorDoc";

/** OffPageConnectorDoc ↔ OffPageConnectorState conversion (Frame-family shared logic generated from features). */
export const {
	toState: offPageConnectorToState,
	toDoc: offPageConnectorToDoc,
} = createFrameMapper<OffPageConnectorDoc, OffPageConnectorState>(
	OffPageConnectorFeatures,
);
