import { createFrameMapper } from "@workspace/canvas/unstable";

import type { GearState } from "./GearState";
import type { GearDoc } from "../../schema/gear/GearDoc";
import { GearFeatures } from "../../schema/gear/GearDoc";

/** GearDoc <-> GearState conversion (Frame-family shared logic generated from features). */
export const { toState: gearToState, toDoc: gearToDoc } = createFrameMapper<
	GearDoc,
	GearState
>(GearFeatures);
