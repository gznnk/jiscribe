import type { CloudState } from "./CloudState";
import type { CloudDoc } from "../../../../schemas/objects/general/cloud/CloudDoc";
import { CloudFeatures } from "../../../../schemas/objects/general/cloud/CloudDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** CloudDoc ↔ CloudState conversion (Frame-family shared logic generated from features). */
export const { toState: cloudToState, toDoc: cloudToDoc } = createFrameMapper<
	CloudDoc,
	CloudState
>(CloudFeatures);
