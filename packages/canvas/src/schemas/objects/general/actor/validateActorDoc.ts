import { ActorFeatures } from "./ActorDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates an ActorDoc (Frame-family shared logic generated from features). */
export const validateActorDoc: ObjectDocValidateFn =
	createFrameDocValidator(ActorFeatures);
