import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { ACTOR_DOC_DEFAULTS } from "./ActorDoc";

/** Factory for creating Actor shapes (Frame-family shared logic generated from defaults). */
export const ActorObjectFactory = createFrameObjectFactory(ACTOR_DOC_DEFAULTS);
