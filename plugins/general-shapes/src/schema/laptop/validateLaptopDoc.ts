import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { LaptopFeatures } from "./LaptopDoc";

/** Validates a LaptopDoc (Frame-family shared logic generated from features). */
export const validateLaptopDoc: ObjectDocValidateFn =
	createFrameDocValidator(LaptopFeatures);
