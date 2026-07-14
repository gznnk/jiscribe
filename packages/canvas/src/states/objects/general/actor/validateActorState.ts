import { ActorFeatures } from "../../../../schemas/objects/general/actor/ActorDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ActorState (Frame-family common logic generated from features). */
export const isValidActorState: ObjectStateValidateFn =
	createFrameStateValidator(ActorFeatures);
