import { createFrameMapper } from "@workspace/canvas/unstable";

import type { CloudState } from "./CloudState";
import type { CloudDoc } from "../schema/CloudDoc";
import { CloudFeatures } from "../schema/CloudDoc";

/** CloudDoc ↔ CloudState conversion (Frame-family shared logic generated from features). */
export const { toState: cloudToState, toDoc: cloudToDoc } = createFrameMapper<
	CloudDoc,
	CloudState
>(CloudFeatures);
