import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { RECORD_DOC_DEFAULTS } from "./RecordDoc";

/** Factory for creating Record shapes (Frame-family shared logic generated from defaults). */
export const RecordObjectFactory =
	createFrameObjectFactory(RECORD_DOC_DEFAULTS);
