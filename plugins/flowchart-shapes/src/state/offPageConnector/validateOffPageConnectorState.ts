import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { OffPageConnectorFeatures } from "../../schema/offPageConnector/OffPageConnectorDoc";

/** Validates OffPageConnectorState (Frame-family common logic generated from features). */
export const isValidOffPageConnectorState: ObjectStateValidator =
	createFrameStateValidator(OffPageConnectorFeatures);
