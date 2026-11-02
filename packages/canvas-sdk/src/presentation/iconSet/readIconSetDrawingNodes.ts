import type { CanvasColorScheme } from "@jiscribe/canvas";

import type {
	IconSetDrawing,
	IconSetNode,
} from "../../schema/iconSet/IconSetTypes";

/**
 * Picks which of an icon's renditions to draw on the ground the theme sets.
 * Both renditions are the vendor's own; most icons have one only, drawn in
 * colours that read on either ground.
 *
 * @param drawing - the icon, whose `darkNodes` is absent unless the set ships one
 * @param colorScheme - the active theme's ground; anything but `"dark"` takes
 *   the light rendition
 * @returns the elements to draw, the very array the drawing holds
 */
export const readIconSetDrawingNodes = (
	drawing: IconSetDrawing,
	colorScheme: CanvasColorScheme,
): readonly IconSetNode[] =>
	colorScheme === "dark" ? (drawing.darkNodes ?? drawing.nodes) : drawing.nodes;
