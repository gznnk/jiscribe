import type { Dimensions } from "@jiscribe/geometry";

import type {
	TextSlot,
	TextSlotStyle,
} from "../../model/objects/types/text/TextSlot";
import { readTextSlotContent } from "../../model/objects/types/text/TextSlot";
import { calcTextBlockSize } from "../block/calcTextBlockSize";
import { resolveDocBodyFont } from "../object/resolveDocBodyFont";

/**
 * Size of the box a caption takes when it is sized from its own text rather than
 * from the shape's box: the text laid out as authored, so the box grows sideways
 * with the longest line and breaks only where the author typed a newline
 * (calcTextBlockSize). Part of the text drawn larger widens and heightens its own
 * line, so a caption styled per range still gets a box that holds it.
 *
 * Measured with the font it is drawn with: the body's own fields over the type's
 * defaults, over the shared last resort (resolveDocBodyFont) — the resolution the
 * overlay makes through ObjectTextStyleDefaultsRegistry.
 *
 * @param body - The caption's content and styling: a doc's root text fields or a state's body slot, both of which carry them under these names; undefined, or one with no `text`, sizes an empty caption
 * @param typeDefaults - The type's defaults for its body slot, as ObjectTextStyleDefaultsRegistry gives them (the family left out, see there); undefined for a type that declares none
 * @returns The box size in local px, the text padding included. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcLabelTextBoxSize = (
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
): Dimensions =>
	calcTextBlockSize(
		body?.text === undefined ? "" : readTextSlotContent(body.text),
		resolveDocBodyFont(body ?? {}, typeDefaults),
	);
