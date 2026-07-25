import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { PARALLELOGRAM_DOC_DEFAULTS } from "./ParallelogramDoc";

/** Factory for creating Parallelogram shapes (Frame-family shared logic generated from defaults). */
export const ParallelogramObjectFactory = createFrameObjectFactory(
	PARALLELOGRAM_DOC_DEFAULTS,
);
