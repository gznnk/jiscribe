import { createFrameMapper } from "@workspace/canvas-sdk";

import type { ShieldState } from "./ShieldState";
import type { ShieldDoc } from "../../schema/shield/ShieldDoc";
import { ShieldFeatures } from "../../schema/shield/ShieldDoc";

/** ShieldDoc <-> ShieldState conversion (Frame-family shared logic generated from features). */
export const { toState: shieldToState, toDoc: shieldToDoc } = createFrameMapper<
	ShieldDoc,
	ShieldState
>(ShieldFeatures);
