import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { DB_DOC_DEFAULTS } from "./DbDoc";

/** Factory for creating Db shapes (Frame-family shared logic generated from defaults). */
export const DbObjectFactory = createFrameObjectFactory(DB_DOC_DEFAULTS);
