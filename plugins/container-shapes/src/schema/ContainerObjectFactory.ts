import { createFrameObjectFactory } from "@workspace/canvas/unstable";

import { CONTAINER_DOC_DEFAULTS } from "./ContainerDoc";

/** Factory for creating Container shapes (Frame-family shared logic generated from defaults). */
export const ContainerObjectFactory = createFrameObjectFactory(
	CONTAINER_DOC_DEFAULTS,
);
