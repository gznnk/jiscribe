import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { EnvelopeFeatures } from "./EnvelopeDoc";

/** Validates a EnvelopeDoc (Frame-family shared logic generated from features). */
export const validateEnvelopeDoc: ObjectDocValidateFn =
	createFrameDocValidator(EnvelopeFeatures);
