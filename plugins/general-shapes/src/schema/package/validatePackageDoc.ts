import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { PackageFeatures } from "./PackageDoc";

/** Validates a PackageDoc (Frame-family shared logic generated from features). */
export const validatePackageDoc: ObjectDocValidateFn =
	createFrameDocValidator(PackageFeatures);
