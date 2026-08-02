import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { QUEUE_DOC_DEFAULTS } from "./QueueDoc";

/** Factory for creating Queue shapes (Frame-family shared logic generated from defaults). */
export const QueueObjectFactory = createFrameObjectFactory(QUEUE_DOC_DEFAULTS);
