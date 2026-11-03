import { ARROW_OUTLINE_THINNING_SCALE } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";

/**
 * Width (local units, before the head's `strokeWidth × arrowScale` scale) of the
 * strokes a line-drawn head is built from, the `outlineWidth` Arrow takes.
 *
 * @param arrowScale - The resolved factor on the head's size (`arrowScale`, 1 when unset)
 * @returns `1 / max(arrowScale, ARROW_OUTLINE_THINNING_SCALE)`: the line's own stroke width in
 *   world units from that scale up, `strokeWidth × arrowScale / ARROW_OUTLINE_THINNING_SCALE` below it
 */
export const calcArrowOutlineWidth = (arrowScale: number): number =>
	1 / Math.max(arrowScale, ARROW_OUTLINE_THINNING_SCALE);
