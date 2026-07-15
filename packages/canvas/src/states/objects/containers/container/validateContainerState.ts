import { ContainerFeatures } from "../../../../schemas/objects/containers/container/ContainerDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ContainerState (Frame-family common logic generated from features). */
export const isValidContainerState: ObjectStateValidateFn =
	createFrameStateValidator(ContainerFeatures);
