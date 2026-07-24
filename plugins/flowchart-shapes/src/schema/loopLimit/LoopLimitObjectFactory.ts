import { createFrameObjectFactory } from "@workspace/canvas/unstable";

import { LOOP_LIMIT_DOC_DEFAULTS } from "./LoopLimitDoc";

/** Factory for creating LoopLimit shapes (Frame-family shared logic generated from defaults). */
export const LoopLimitObjectFactory = createFrameObjectFactory(
	LOOP_LIMIT_DOC_DEFAULTS,
);
