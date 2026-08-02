import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { LaptopFeatures } from "./LaptopDoc";

/** Validates a LaptopDoc (Frame-family shared logic generated from features). */
export const validateLaptopDoc: ObjectDocValidateFn =
	createFrameDocValidator(LaptopFeatures);
