import type { ActorState } from "./ActorState";
import type { ActorDoc } from "../../../../schemas/objects/general/actor/ActorDoc";
import { ActorFeatures } from "../../../../schemas/objects/general/actor/ActorDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** ActorDoc ↔ ActorState conversion (Frame-family shared logic generated from features). */
export const { toState: actorToState, toDoc: actorToDoc } = createFrameMapper<
	ActorDoc,
	ActorState
>(ActorFeatures);
