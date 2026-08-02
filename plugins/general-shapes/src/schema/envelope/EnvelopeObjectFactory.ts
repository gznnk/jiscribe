import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { ENVELOPE_DOC_DEFAULTS } from "./EnvelopeDoc";

/** Factory for creating Envelope shapes (Frame-family shared logic generated from defaults). */
export const EnvelopeObjectFactory = createFrameObjectFactory(
	ENVELOPE_DOC_DEFAULTS,
);
