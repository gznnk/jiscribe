import { isNumber } from "@workspace/basic-validators";
import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { ContainerFeatures } from "../schema/ContainerDoc";

/**
 * Validates ContainerState (Frame-family common logic + optional headerHeight).
 * The headerHeight bound (>= 1) matches validateContainerDoc and the JSON schema.
 */
export const isValidContainerState: ObjectStateValidator =
	createFrameStateValidator(
		ContainerFeatures,
		(o) =>
			o.headerHeight === undefined ||
			(isNumber(o.headerHeight) && o.headerHeight >= 1),
	);
