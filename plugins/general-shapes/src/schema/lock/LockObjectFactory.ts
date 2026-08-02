import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { LOCK_DOC_DEFAULTS } from "./LockDoc";

/** Factory for creating Lock shapes (Frame-family shared logic generated from defaults). */
export const LockObjectFactory = createFrameObjectFactory(LOCK_DOC_DEFAULTS);
