// Where the UML shapes lay their text out, declared once for both halves of their
// definitions: the doc definitions (./doc.ts, what a headless overflow check
// measures against) and the UI definitions (../definition.ts, what the overlay
// draws and the editor edits in).
//
// `record` is absent: its box is divided into bands each sized from their own
// text, so it declares `calcOutsideBoxTextRegion` instead. `umlComponent` draws
// over the whole box and declares `calcFullBoxTextRegion`.
import type { Dimensions, Rect } from "@jiscribe/geometry";

import { calcUmlPackageTabHeight } from "./UmlPackageDoc";

/**
 * The package's text region: the body below the tab. A fixed ratio inset cannot
 * express it, the tab being a fixed height clamped on short boxes
 * (calcUmlPackageTabHeight).
 *
 * The region is the body in full — the shared text box adds its own padding
 * inside it (TextOverlayFrame) — so the name is centered in the body rather than
 * in the box, and a first line can never run into the tab.
 *
 * @param doc - The package's untransformed box; the tab height is clamped against the height, so a short box gives up proportionally less
 * @returns The region in local coordinates (shape center as origin), top-left based
 */
export const calcUmlPackageTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const tabHeight = calcUmlPackageTabHeight(height);
	return {
		x: -width / 2,
		y: -height / 2 + tabHeight,
		width,
		height: height - tabHeight,
	};
};
