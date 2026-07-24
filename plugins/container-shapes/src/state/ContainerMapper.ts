import { createFrameMapper } from "@workspace/canvas/unstable";

import type { ContainerState } from "./ContainerState";
import { ContainerFeatures } from "../schema/ContainerDoc";
import type { ContainerDoc } from "../schema/ContainerDoc";

/** ContainerDoc <-> ContainerState conversion (Frame-family shared logic generated from features). */
export const { toState: containerToState, toDoc: containerToDoc } =
	createFrameMapper<ContainerDoc, ContainerState>(ContainerFeatures, [
		"headerFill",
		"headerHeight",
	]);
