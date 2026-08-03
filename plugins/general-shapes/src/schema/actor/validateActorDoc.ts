import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { ActorFeatures } from "./ActorDoc";

/** Validates an ActorDoc (Frame-family shared logic generated from features). */
export const validateActorDoc: ObjectDocValidateFn =
	createFrameDocValidator(ActorFeatures);
