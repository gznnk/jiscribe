import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import { calcTextBlockSize } from "@jiscribe/doc/text/block/calcTextBlockSize";
import type { Dimensions } from "@jiscribe/geometry";

import type { TextObjectTypography } from "./resolveTextObjectFont";
import { resolveTextObjectFont } from "./resolveTextObjectFont";

/**
 * Size of the box a `text` object occupies. The doc of a point-geometry shape
 * carries no width/height, so this measurement is the only source of both, and
 * every path that builds or refreshes a text object goes through it.
 *
 * @param text - The whole body, authored newlines included; an empty string still yields the minimum box. A part of it drawn larger grows the box around it (calcTextBlockSize)
 * @param typography - The object's own text styling; each unset field falls back to what the overlay draws with
 * @returns The box size in local pixels, the text padding included
 */
export const calcTextObjectFrameSize = (
	text: RichText,
	typography: TextObjectTypography,
): Dimensions => calcTextBlockSize(text, resolveTextObjectFont(typography));
