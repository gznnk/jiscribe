import type { DbState } from "./DbState";
import type { DbDoc } from "../../../../schemas/objects/flowchart/db/DbDoc";
import { DbFeatures } from "../../../../schemas/objects/flowchart/db/DbDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DbDoc ↔ DbState conversion (Frame-family shared logic generated from features). */
export const { toState: dbToState, toDoc: dbToDoc } = createFrameMapper<
	DbDoc,
	DbState
>(DbFeatures);
