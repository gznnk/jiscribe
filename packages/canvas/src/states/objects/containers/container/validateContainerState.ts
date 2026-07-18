import { isNumber } from "@workspace/basic-validators";

import { ContainerFeatures } from "../../../../schemas/objects/containers/container/ContainerDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

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
