import type { Dimensions } from "@jiscribe/geometry";

import type { RichText } from "../../model/objects/types/RichText";
import { calcTextBlockSize } from "../block/calcTextBlockSize";
import { calcWrappedTextBlockSize } from "../block/calcWrappedTextBlockSize";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/**
 * Size of the box a point-geometry shape occupies. Its doc carries no width or height,
 * so this measurement is the only source of both, and every path that builds, refreshes
 * or measures one goes through it.
 *
 * The font arrives already resolved because the two sides resolve it differently: the
 * canvas reads a state's slot (`resolveTextObjectFont`), doc-ops reads the flat fields a
 * `text: "body"` doc spells its styling out in (`resolveBodyFont`). What must not differ
 * between them is the rule below — which layout measures against a width and which widens
 * to its longest line — so that is what lives here.
 *
 * @param text - The whole body, authored newlines included; an empty string still yields
 *   the minimum box. A part of it drawn larger grows the box around it (calcTextBlockSize)
 * @param font - The resolved font the body is drawn with, fallbacks already filled in
 * @param blockWidth - Width the body wraps in, for a `textLayout: "block"` doc; omitted
 *   (the label layout, and a block doc missing its width) lets the box widen to the
 *   longest line instead
 * @returns The box size in local pixels, the text padding included
 */
export const calcTextObjectFrameSize = (
	text: RichText,
	font: TextMeasureFont,
	blockWidth?: number,
): Dimensions =>
	blockWidth === undefined
		? calcTextBlockSize(text, font)
		: calcWrappedTextBlockSize(text, font, blockWidth);
