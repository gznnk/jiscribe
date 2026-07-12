import type { CardState } from "./CardState";
import type { CardDoc } from "../../../../schemas/objects/primitives/card/CardDoc";
import { CardFeatures } from "../../../../schemas/objects/primitives/card/CardDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** CardDoc <-> CardState conversion (Frame-family shared logic generated from features). */
export const { toState: cardToState, toDoc: cardToDoc } = createFrameMapper<
	CardDoc,
	CardState
>(CardFeatures);
