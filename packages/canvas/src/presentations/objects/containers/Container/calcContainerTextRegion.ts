import type { Dimensions, Rect } from "@workspace/geometry";

import { CONTAINER_HEADER_HEIGHT } from "../../../../schemas/objects/containers/container/ContainerDoc";

/**
 * The title occupies the top header band, not the full box (the body holds
 * other objects). Region is local (origin at the shape center), top-left based.
 */
export const calcContainerTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const headerHeight = Math.min(CONTAINER_HEADER_HEIGHT, height);
	return { x: -width / 2, y: -height / 2, width, height: headerHeight };
};
