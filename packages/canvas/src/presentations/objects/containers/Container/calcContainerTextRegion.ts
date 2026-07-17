import type { Dimensions } from "@workspace/geometry";

import { calcContainerHeaderHeight } from "./calcContainerHeaderHeight";
import type { ContainerState } from "../../../../states/objects/containers/container/ContainerState";
import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/**
 * The title occupies the top header band, not the full box (the body holds
 * other objects). Region is local (origin at the shape center), top-left based.
 * `headerHeight` carries the per-object band height (absent = default).
 */
export const calcContainerTextRegion: TextRegionCalculator<
	Dimensions & Pick<ContainerState, "headerHeight">
> = (state) => {
	const { width, height } = state;
	const headerHeight = calcContainerHeaderHeight(state);
	return { x: -width / 2, y: -height / 2, width, height: headerHeight };
};
