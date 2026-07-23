import { ACTOR_DOC_DEFAULTS } from "./ActorDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Actor shapes (Frame-family shared logic generated from defaults). */
export const ActorObjectFactory = createFrameObjectFactory(ACTOR_DOC_DEFAULTS);
