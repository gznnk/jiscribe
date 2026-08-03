import { createFrameMapper } from "@workspace/canvas-sdk";

import type { CardState } from "./CardState";
import type { CardDoc } from "../../schema/card/CardDoc";
import { CardFeatures } from "../../schema/card/CardDoc";

/** CardDoc <-> CardState conversion (Frame-family shared logic generated from features). */
export const { toState: cardToState, toDoc: cardToDoc } = createFrameMapper<
	CardDoc,
	CardState
>(CardFeatures);
