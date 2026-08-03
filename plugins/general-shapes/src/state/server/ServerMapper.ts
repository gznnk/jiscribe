import { createFrameMapper } from "@workspace/canvas-sdk";

import type { ServerState } from "./ServerState";
import type { ServerDoc } from "../../schema/server/ServerDoc";
import { ServerFeatures } from "../../schema/server/ServerDoc";

/** ServerDoc <-> ServerState conversion (Frame-family shared logic generated from features). */
export const { toState: serverToState, toDoc: serverToDoc } = createFrameMapper<
	ServerDoc,
	ServerState
>(ServerFeatures);
