import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";

import { calcUmlPackageTabHeight } from "../schema/UmlPackageDoc";

/**
 * The package's text region: the body below the tab, in local coordinates
 * (origin at the shape center). A fixed ratio inset cannot express it, the tab
 * being a fixed height clamped on short boxes (calcUmlPackageTabHeight).
 *
 * The region is the body in full — the shared text box adds its own padding
 * inside it (TextOverlayFrame) — so the name is centered in the body rather than
 * in the box, and a first line can never run into the tab.
 */
export const calcUmlPackageTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) => {
	const tabHeight = calcUmlPackageTabHeight(height);
	return {
		x: -width / 2,
		y: -height / 2 + tabHeight,
		width,
		height: height - tabHeight,
	};
};
