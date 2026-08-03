import { createFrameMapper } from "@workspace/canvas-sdk";

import type { DbState } from "./DbState";
import type { DbDoc } from "../../schema/db/DbDoc";
import { DbFeatures } from "../../schema/db/DbDoc";

/** DbDoc ↔ DbState conversion (Frame-family shared logic generated from features). */
export const { toState: dbToState, toDoc: dbToDoc } = createFrameMapper<
	DbDoc,
	DbState
>(DbFeatures);
