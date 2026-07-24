import { createFrameObjectFactory } from "@workspace/canvas/unstable";

import { OFF_PAGE_CONNECTOR_DOC_DEFAULTS } from "./OffPageConnectorDoc";

/** Factory for creating OffPageConnector shapes (Frame-family shared logic generated from defaults). */
export const OffPageConnectorObjectFactory = createFrameObjectFactory(
	OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
);
