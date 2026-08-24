import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import { calcTextBlockSize } from "@jiscribe/doc/text/block/calcTextBlockSize";
import { calcWrappedTextBlockSize } from "@jiscribe/doc/text/block/calcWrappedTextBlockSize";
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
 * @param blockWidth - Width the body wraps in, for a `textLayout: "block"` doc; omitted (the label layout, and a block doc missing its width) lets the box widen to the longest line instead
 * @returns The box size in local pixels, the text padding included
 */
export const calcTextObjectFrameSize = (
	text: RichText,
	typography: TextObjectTypography,
	blockWidth?: number,
): Dimensions =>
	blockWidth === undefined
		? calcTextBlockSize(text, resolveTextObjectFont(typography))
		: calcWrappedTextBlockSize(
				text,
				resolveTextObjectFont(typography),
				blockWidth,
			);
