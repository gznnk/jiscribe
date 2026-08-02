import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { PACKAGE_DOC_DEFAULTS } from "./PackageDoc";

/** Factory for creating Package shapes (Frame-family shared logic generated from defaults). */
export const PackageObjectFactory =
	createFrameObjectFactory(PACKAGE_DOC_DEFAULTS);
