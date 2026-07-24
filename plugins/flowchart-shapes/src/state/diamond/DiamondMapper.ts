import { createFrameMapper } from "@workspace/canvas/unstable";

import type { DiamondState } from "./DiamondState";
import type { DiamondDoc } from "../../schema/diamond/DiamondDoc";
import { DiamondFeatures } from "../../schema/diamond/DiamondDoc";

/** DiamondDoc ↔ DiamondState conversion (Frame-family shared logic generated from features). */
export const { toState: diamondToState, toDoc: diamondToDoc } =
	createFrameMapper<DiamondDoc, DiamondState>(DiamondFeatures);
