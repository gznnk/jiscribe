import type { Dimensions } from "@workspace/geometry";

import type { TextObjectTypography } from "./resolveTextObjectFont";
import { resolveTextObjectFont } from "./resolveTextObjectFont";
import { calcTextBlockSize } from "../../../../utils/text/calcTextBlockSize";

/**
 * Size of the box a `text` object occupies. The doc of a point-geometry shape
 * carries no width/height, so this measurement is the only source of both, and
 * every path that builds or refreshes a text object goes through it.
 *
 * @param text - The whole body, authored newlines included; an empty string still yields the minimum box
 * @param typography - The object's own text styling; each unset field falls back to what the overlay draws with
 * @param fallbackFontFamily - Family used when `typography.fontFamily` is unset. Pass the family the text is actually drawn in (the host theme's), or the box comes out a few percent narrow and clips the last characters
 * @returns The box size in local pixels, the text padding included
 */
export const calcTextObjectFrameSize = (
	text: string,
	typography: TextObjectTypography,
	fallbackFontFamily: string,
): Dimensions =>
	calcTextBlockSize(
		text,
		resolveTextObjectFont(typography, fallbackFontFamily),
	);
