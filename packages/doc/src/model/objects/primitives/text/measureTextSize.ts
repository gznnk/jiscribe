import type { Dimensions } from "@jiscribe/geometry";

import { TEXT_DOC_DEFAULTS } from "./TextDoc";
import { calcTextObjectFrameSize } from "../../../../text/object/calcTextObjectFrameSize";
import { resolveDocBodyFont } from "../../../../text/object/resolveDocBodyFont";
import { isRichText } from "../../types/text/RichText";

/**
 * The box a text draws, which is the whole of its size. The type's one measurement:
 * what the factory places a new text by (TextObjectFactory) and what the type's
 * `bounds` measures a saved one by (calcTextDocBounds), so the two cannot disagree
 * about where a text ends.
 *
 * TEXT_DOC_DEFAULTS stand in for the font fields the doc leaves unset: the factory's
 * doc has them merged in already, while a loaded doc states only what its file
 * states. Only the block layout wraps in a stored width — the rule
 * `TextMapper.textToState` measures a loaded doc by, so a created text and a
 * reloaded one agree on the box.
 *
 * @param doc - Any text doc, or the merged defaults a factory is about to write; `text`, `textLayout` and `width` are read for the content and the wrap, the four font fields for the measurement
 * @returns The size in local px; a doc holding no text measures as the empty string, which still has a line's height
 */
export const measureTextSize = (
	doc: Readonly<Record<string, unknown>>,
): Dimensions =>
	calcTextObjectFrameSize(
		isRichText(doc.text) ? doc.text : "",
		resolveDocBodyFont(doc, TEXT_DOC_DEFAULTS),
		doc.textLayout === "block" && typeof doc.width === "number"
			? doc.width
			: undefined,
	);
