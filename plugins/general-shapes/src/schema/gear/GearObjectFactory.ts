import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { GEAR_DOC_DEFAULTS } from "./GearDoc";

/** Factory for creating Gear shapes (Frame-family shared logic generated from defaults). */
export const GearObjectFactory = createFrameObjectFactory(GEAR_DOC_DEFAULTS);
