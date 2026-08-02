import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { PackageFeatures } from "../../schema/package/PackageDoc";

/** Validates PackageState (Frame-family common logic generated from features). */
export const isValidPackageState: ObjectStateValidator =
	createFrameStateValidator(PackageFeatures);
