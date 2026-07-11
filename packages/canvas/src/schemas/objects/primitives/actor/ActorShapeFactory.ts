import { ACTOR_DOC_DEFAULTS } from "./ActorDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Actor shapes (Frame-family shared logic generated from defaults). */
export const ActorShapeFactory = createFrameShapeFactory(ACTOR_DOC_DEFAULTS);
