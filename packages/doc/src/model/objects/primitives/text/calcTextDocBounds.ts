import { convertFrameToRect } from "@jiscribe/geometry";

import { measureTextSize } from "./measureTextSize";
import type { ObjectDocBoundsResolver } from "../../../../plugin/ObjectDocBounds";
import { numberOverride } from "../../utils/numberOverride";
import { calcPointDocCenter } from "../../utils/pointDocDrawnTopLeft";

/**
 * The box a text doc draws: the text's own extent, pinned by the drawn corner the
 * doc stores. The `text` type's `ObjectDocDefinition.bounds` — what reports, aligns
 * and distributes a saved text — measured by the same resolver its factory places a
 * new one with, so the two agree on where it ends.
 *
 * @param doc - Any text doc, or the merged defaults a factory is about to write; `x` / `y` are read as the drawn top-left corner, each as the origin where it is not a finite number, and the measurement reads the text, layout and font fields (measureTextSize)
 * @returns The untransformed box in world coordinates, centred on the same centre the stored corner puts the measured box at; never null, a text holding no text still measuring a line's height
 */
export const calcTextDocBounds: ObjectDocBoundsResolver = (doc) => {
	const size = measureTextSize(doc);
	const center = calcPointDocCenter(
		{ x: numberOverride(doc.x, 0), y: numberOverride(doc.y, 0) },
		size,
		doc,
	);
	return convertFrameToRect({ cx: center.x, cy: center.y, ...size });
};
