import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Dimensions, RatioInsets } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

/**
 * Builds a `textRegion` calculator for shapes whose text region is a fixed
 * ratio inset of the bounding box (see calcInsetRect), for shapes that need
 * nothing state-dependent — the insets are evaluated once, at definition time,
 * and reused for every state. A shape whose inset depends on width/height
 * (e.g. a fixed-radius cap) needs its own calculator instead.
 *
 * @param insets Per-edge insets as ratios of the box width / height, same shape as calcInsetRect's second argument
 * @returns A calculator usable directly as an `ObjectTypeDefinition`'s `textRegion`
 */
export const createInsetTextRegion =
	(insets: RatioInsets): ObjectTextRegionCalculator<Dimensions> =>
	({ width, height }) =>
		calcInsetRect({ cx: 0, cy: 0, width, height }, insets);
