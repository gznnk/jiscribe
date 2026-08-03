import { createFrameMapper } from "@workspace/canvas-sdk";

import type { CloudState } from "./CloudState";
import type { CloudDoc } from "../../schema/cloud/CloudDoc";
import { CloudFeatures } from "../../schema/cloud/CloudDoc";

/** CloudDoc ↔ CloudState conversion (Frame-family shared logic generated from features). */
export const { toState: cloudToState, toDoc: cloudToDoc } = createFrameMapper<
	CloudDoc,
	CloudState
>(CloudFeatures);
