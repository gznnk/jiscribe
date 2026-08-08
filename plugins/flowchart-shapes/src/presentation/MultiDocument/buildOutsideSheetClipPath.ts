/**
 * Builds a clip path covering everything **outside** one sheet: an enclosing
 * frame with the sheet punched out of it, which the even-odd fill rule turns
 * into the area the sheet does not occupy. Clipping a sheet with this leaves
 * only the parts no sheet in front of it covers.
 *
 * @param sheetPath - The covering sheet's own path, in the shape's local (centered) coordinates
 * @param width - Width of the shape's bounding box; the frame is drawn at twice this, so strokes near the edge stay inside it
 * @param height - Height of the shape's bounding box; used the same way as width
 * @returns A `d` attribute to be drawn with `clip-rule="evenodd"`
 */
export const buildOutsideSheetClipPath = (
	sheetPath: string,
	width: number,
	height: number,
): string =>
	`M ${-width} ${-height} H ${width} V ${height} H ${-width} Z ${sheetPath}`;
