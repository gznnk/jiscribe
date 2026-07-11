import type { StadiumState } from "./StadiumState";
import type { StadiumDoc } from "../../../../schemas/objects/primitives/stadium/StadiumDoc";
import { StadiumFeatures } from "../../../../schemas/objects/primitives/stadium/StadiumDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** StadiumDoc ↔ StadiumState conversion (Frame-family shared logic generated from features). */
export const { toState: stadiumToState, toDoc: stadiumToDoc } =
	createFrameMapper<StadiumDoc, StadiumState>(StadiumFeatures);
