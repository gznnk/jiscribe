import { createFrameMapper } from "@workspace/canvas-sdk";

import type { ActorState } from "./ActorState";
import type { ActorDoc } from "../../schema/actor/ActorDoc";
import { ActorFeatures } from "../../schema/actor/ActorDoc";

/** ActorDoc ↔ ActorState conversion (Frame-family shared logic generated from features). */
export const { toState: actorToState, toDoc: actorToDoc } = createFrameMapper<
	ActorDoc,
	ActorState
>(ActorFeatures);
