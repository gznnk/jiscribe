import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { MANUAL_INPUT_DOC_DEFAULTS } from "./ManualInputDoc";

/** Factory for creating ManualInput shapes (Frame-family shared logic generated from defaults). */
export const ManualInputObjectFactory = createFrameObjectFactory(
	MANUAL_INPUT_DOC_DEFAULTS,
);
