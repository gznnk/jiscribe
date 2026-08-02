import { createFrameMapper } from "@workspace/canvas/unstable";

import type { EnvelopeState } from "./EnvelopeState";
import type { EnvelopeDoc } from "../../schema/envelope/EnvelopeDoc";
import { EnvelopeFeatures } from "../../schema/envelope/EnvelopeDoc";

/** EnvelopeDoc <-> EnvelopeState conversion (Frame-family shared logic generated from features). */
export const { toState: envelopeToState, toDoc: envelopeToDoc } =
	createFrameMapper<EnvelopeDoc, EnvelopeState>(EnvelopeFeatures);
