import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { LAPTOP_DOC_DEFAULTS } from "./LaptopDoc";

/** Factory for creating Laptop shapes (Frame-family shared logic generated from defaults). */
export const LaptopObjectFactory =
	createFrameObjectFactory(LAPTOP_DOC_DEFAULTS);
