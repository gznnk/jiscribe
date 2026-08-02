import { createFrameMapper } from "@workspace/canvas/unstable";

import type { PackageState } from "./PackageState";
import type { PackageDoc } from "../../schema/package/PackageDoc";
import { PackageFeatures } from "../../schema/package/PackageDoc";

/** PackageDoc <-> PackageState conversion (Frame-family shared logic generated from features). */
export const { toState: packageToState, toDoc: packageToDoc } =
	createFrameMapper<PackageDoc, PackageState>(PackageFeatures);
