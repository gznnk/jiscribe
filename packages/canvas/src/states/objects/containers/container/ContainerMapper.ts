import type { ContainerState } from "./ContainerState";
import type { ContainerDoc } from "../../../../schemas/objects/containers/container/ContainerDoc";
import { ContainerFeatures } from "../../../../schemas/objects/containers/container/ContainerDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** ContainerDoc <-> ContainerState conversion (Frame-family shared logic generated from features). */
export const { toState: containerToState, toDoc: containerToDoc } =
	createFrameMapper<ContainerDoc, ContainerState>(ContainerFeatures, [
		"headerFill",
		"headerHeight",
	]);
