import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { ActorFeatures } from "../schema/ActorDoc";

/** Validates ActorState (Frame-family common logic generated from features). */
export const isValidActorState: ObjectStateValidator =
	createFrameStateValidator(ActorFeatures);
