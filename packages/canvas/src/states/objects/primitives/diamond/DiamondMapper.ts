import type { DiamondState } from "./DiamondState";
import type { DiamondDoc } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import { DiamondFeatures } from "../../../../schemas/objects/primitives/diamond/DiamondDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DiamondDoc ↔ DiamondState conversion (Frame-family shared logic generated from features). */
export const { toState: diamondToState, toDoc: diamondToDoc } =
	createFrameMapper<DiamondDoc, DiamondState>(DiamondFeatures);
