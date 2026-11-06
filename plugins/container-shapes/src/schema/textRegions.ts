// Where the container lays its title out, declared once for both halves of its
// definition: the doc definition (./doc.ts, what a headless overflow check
// measures against) and the UI definition (../definition.ts, what the overlay
// draws and the editor edits in).
import type { Rect } from "@jiscribe/geometry";

import { calcContainerHeaderHeight } from "./calcContainerHeaderHeight";
import type { ContainerDoc } from "./ContainerDoc";

/**
 * The title occupies the top header band, not the full box (the body holds
 * other objects).
 *
 * @param shape - The container's untransformed box plus its `headerHeight` (absent = the default band height)
 * @returns The band in local coordinates (shape center as origin), top-left based
 */
export const calcContainerTextRegion = (
	shape: Pick<ContainerDoc, "width" | "height" | "headerHeight">,
): Rect => {
	const { width, height } = shape;
	return {
		x: -width / 2,
		y: -height / 2,
		width,
		height: calcContainerHeaderHeight(shape),
	};
};
