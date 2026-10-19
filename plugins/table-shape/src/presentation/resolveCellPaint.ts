import { resolveAutoColor } from "@jiscribe/canvas-sdk";

import { UNFILLED_CELL_FILL } from "../schema/TableDoc";

/**
 * The CSS color one cell's surface is painted with.
 *
 * A stored `"auto"` follows the theme's shape surface, as every other fill does,
 * while an absent one paints nothing — which is why the two cannot share a code
 * path here: `resolveAutoColor` turns an absent fill into an opaque default.
 *
 * @param fill - The cell's `fill` as the state holds it (TableCell); undefined
 *   for a cell that was never given one, drawn exactly as a stored `"transparent"`
 * @returns A CSS color, possibly a `var(--jiscribe-*)` token — so apply it
 *   through CSS rather than as an SVG presentation attribute
 */
export const resolveCellPaint = (fill: string | undefined): string =>
	fill === undefined ? UNFILLED_CELL_FILL : resolveAutoColor(fill, "surface");
