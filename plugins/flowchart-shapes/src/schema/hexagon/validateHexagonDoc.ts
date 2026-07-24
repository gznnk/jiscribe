import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { HexagonFeatures } from "./HexagonDoc";

/** Validates a HexagonDoc (Frame-family shared logic generated from features). */
export const validateHexagonDoc: ObjectDocValidateFn =
	createFrameDocValidator(HexagonFeatures);
