import type { Dimensions, RatioInsets, Rect } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

/**
 * Builds the text-region calculator of a shape whose region is a fixed ratio
 * inset of the bounding box (see calcInsetRect), for shapes that need nothing
 * state-dependent — the insets are evaluated once, at definition time, and
 * reused for every size. A shape whose inset depends on width/height (e.g. a
 * fixed-radius cap) needs its own calculator instead.
 *
 * Headless, so the result serves as both the doc definition's `textRegion` and
 * the UI definition's: the two are the same function, and nothing can drift.
 *
 * @param insets - Per-edge insets as ratios of the box width / height, same shape as calcInsetRect's second argument; an omitted edge insets by 0, and edges summing past 1 collapse that axis to 0
 * @returns A calculator usable as an `ObjectDocDefinition`'s and an `ObjectTypeDefinition`'s `textRegion` alike
 */
export const createInsetTextRegion =
	(insets: RatioInsets) =>
	({ width, height }: Dimensions): Rect =>
		calcInsetRect({ cx: 0, cy: 0, width, height }, insets);
