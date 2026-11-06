import type { Dimensions } from "@jiscribe/geometry";

import type {
	TextSlot,
	TextSlotStyle,
} from "../../model/objects/types/text/TextSlot";
import { readTextSlotContent } from "../../model/objects/types/text/TextSlot";
import { calcTextBlockSize } from "../block/calcTextBlockSize";
import type { TextMeasureFont } from "../measure/TextMeasureFont";
import { readTextMeasurementGeneration } from "../measure/textMeasurementSlot";
import { resolveDocBodyFont } from "../object/resolveDocBodyFont";

/** One caption size, with everything it was measured from besides the body object. */
type LabelTextBoxSizeCacheEntry = {
	generation: number;
	content: Partial<TextSlot>["text"];
	font: TextMeasureFont;
	size: Dimensions;
};

/**
 * The caption sizes last measured, keyed on the body they were measured from and
 * matched on its content (by identity: every writer replaces `text` rather than
 * editing its runs) and resolved font, so a doc op that rewrites a body in place
 * misses rather than reading back the size of the text it replaced. Weak, so an
 * entry lives exactly as long as its body.
 */
const labelTextBoxSizeCache = new WeakMap<object, LabelTextBoxSizeCacheEntry>();

/** Whether `entry` was measured from exactly `content` in `font` under `generation`. */
const isEntryOf = (
	entry: LabelTextBoxSizeCacheEntry,
	content: Partial<TextSlot>["text"],
	font: TextMeasureFont,
	generation: number,
): boolean =>
	entry.generation === generation &&
	entry.content === content &&
	entry.font.fontSize === font.fontSize &&
	entry.font.fontFamily === font.fontFamily &&
	entry.font.fontWeight === font.fontWeight &&
	entry.font.fontStyle === font.fontStyle;

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
 * Cached on the body object, so a move, a rotation or a resize that hands the
 * same body over measures nothing; the measurement generation
 * (readTextMeasurementGeneration) is part of the match.
 *
 * @param body - The caption's content and styling: a doc's root text fields or a state's body slot, both of which carry them under these names; undefined, or one with no `text`, sizes an empty caption
 * @param typeDefaults - The type's defaults for its body slot, as ObjectTextStyleDefaultsRegistry gives them (the family left out, see there); undefined for a type that declares none
 * @returns The box size in local px, the text padding included. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcLabelTextBoxSize = (
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
): Dimensions => {
	const font = resolveDocBodyFont(body ?? {}, typeDefaults);
	const content = body?.text;
	if (body === undefined) {
		return calcTextBlockSize("", font);
	}
	const generation = readTextMeasurementGeneration();
	const cached = labelTextBoxSizeCache.get(body);
	if (cached !== undefined && isEntryOf(cached, content, font, generation)) {
		return { ...cached.size };
	}
	const size = calcTextBlockSize(
		content === undefined ? "" : readTextSlotContent(content),
		font,
	);
	labelTextBoxSizeCache.set(body, { generation, content, font, size });
	return { ...size };
};
