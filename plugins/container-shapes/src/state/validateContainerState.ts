import { isNumber } from "@workspace/basic-validators";
import type { ObjectStateValidateFn } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { ContainerFeatures } from "../schema/ContainerDoc";

/**
 * Validates ContainerState (Frame-family common logic + optional headerHeight).
 * The headerHeight bound (>= 1) matches validateContainerDoc and the JSON schema.
 */
export const isValidContainerState: ObjectStateValidateFn =
	createFrameStateValidator(
		ContainerFeatures,
		(o) =>
			o.headerHeight === undefined ||
			(isNumber(o.headerHeight) && o.headerHeight >= 1),
	);
