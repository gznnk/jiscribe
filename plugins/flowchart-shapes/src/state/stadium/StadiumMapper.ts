import { createFrameMapper } from "@workspace/canvas/unstable";

import type { StadiumState } from "./StadiumState";
import type { StadiumDoc } from "../../schema/stadium/StadiumDoc";
import { StadiumFeatures } from "../../schema/stadium/StadiumDoc";

/** StadiumDoc ↔ StadiumState conversion (Frame-family shared logic generated from features). */
export const { toState: stadiumToState, toDoc: stadiumToDoc } =
	createFrameMapper<StadiumDoc, StadiumState>(StadiumFeatures);
