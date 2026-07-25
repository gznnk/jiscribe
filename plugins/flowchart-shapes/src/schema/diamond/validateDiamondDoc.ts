import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { DiamondFeatures } from "./DiamondDoc";

/** Validates a DiamondDoc (Frame-family shared logic generated from features). */
export const validateDiamondDoc: ObjectDocValidateFn =
	createFrameDocValidator(DiamondFeatures);
