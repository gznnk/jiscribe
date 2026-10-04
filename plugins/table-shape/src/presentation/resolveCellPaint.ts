import { resolveAutoColor } from "@jiscribe/canvas-sdk";

/** What a cell with no background of its own paints: nothing, while still taking the pointer (see TableCellSurface). */
const UNFILLED_CELL_PAINT = "transparent";

/**
 * The CSS color one cell's surface is painted with. Read by the drawing and by
 * the swatch the menu states it on, so the two cannot disagree about what a cell
 * looks like.
 *
 * A stored `"auto"` follows the theme's shape surface, as every other fill does;
 * an absent one is the only thing that paints nothing, which is why the two
 * cannot share a code path here — `resolveAutoColor` turns an absent fill into
 * an opaque default.
 *
 * @param fill - The cell's `fill` as the state holds it (TableCell); undefined
 *   for a cell that was never given one
 * @returns A CSS color, possibly a `var(--jiscribe-*)` token — so apply it
 *   through CSS rather than as an SVG presentation attribute
 */
export const resolveCellPaint = (fill: string | undefined): string =>
	fill === undefined ? UNFILLED_CELL_PAINT : resolveAutoColor(fill, "surface");
