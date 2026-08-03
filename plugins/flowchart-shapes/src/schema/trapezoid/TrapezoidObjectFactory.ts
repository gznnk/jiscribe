import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { TRAPEZOID_DOC_DEFAULTS } from "./TrapezoidDoc";

/** Factory for creating Trapezoid shapes (Frame-family shared logic generated from defaults). */
export const TrapezoidObjectFactory = createFrameObjectFactory(
	TRAPEZOID_DOC_DEFAULTS,
);
