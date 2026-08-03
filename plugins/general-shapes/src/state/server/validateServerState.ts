import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { ServerFeatures } from "../../schema/server/ServerDoc";

/** Validates ServerState (Frame-family common logic generated from features). */
export const isValidServerState: ObjectStateValidator =
	createFrameStateValidator(ServerFeatures);
