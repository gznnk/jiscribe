import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { EnvelopeFeatures } from "../../schema/envelope/EnvelopeDoc";

/** Validates EnvelopeState (Frame-family common logic generated from features). */
export const isValidEnvelopeState: ObjectStateValidator =
	createFrameStateValidator(EnvelopeFeatures);
