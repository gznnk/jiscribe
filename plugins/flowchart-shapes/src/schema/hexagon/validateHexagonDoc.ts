import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { HexagonFeatures } from "./HexagonDoc";

/** Validates a HexagonDoc (Frame-family shared logic generated from features). */
export const validateHexagonDoc: ObjectDocValidateFn =
	createFrameDocValidator(HexagonFeatures);
