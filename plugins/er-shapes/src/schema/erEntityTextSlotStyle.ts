import { DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type { TextMeasureFont } from "@jiscribe/canvas-sdk/doc";
import { readTextSlotStyleDefaults, resolveTextSlotStyle } from "@jiscribe/doc";
import type {
	ObjectTextSlotStyleDefaults,
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc";

import { parseErEntityColumnTextSlotId } from "./erEntityColumnIds";
import {
	ER_ENTITY_NAME_TEXT_SLOT_ID,
	ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS,
} from "./ErEntityDoc";

/**
 * An entity's text slots, the one part of it a slot's style and the layout's
 * texts are read off. An ErEntityState is one; the doc side builds one from the
 * document (mapErEntityDocToTextSlots).
 */
export type ErEntityTextSlots = Readonly<{
	/** The entity's slots, keyed by slot id; absent reads as none. */
	text?: Readonly<Record<string, TextSlot>>;
}>;

/** What the title band draws with: centered and bold over the column defaults. */
const ER_ENTITY_NAME_TEXT_SLOT_STYLE = {
	...ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS,
	textAlign: "center",
	verticalAlign: "middle",
	fontWeight: "bold",
} as const satisfies TextSlotStyle;

/** What a column's key draws with: bold and centered on its row over the column defaults. */
const ER_ENTITY_KEY_TEXT_SLOT_STYLE = {
	...ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS,
	fontWeight: "bold",
	verticalAlign: "middle",
} as const satisfies TextSlotStyle;

/**
 * The defaults one slot of an entity takes from its role, read off the id alone:
 * the title centered and bold, a column's key bold and centered on its row. A
 * name or a type has no role of its own, whatever its key says. Registered as
 * the type's `byTextSlot`, so it stands in for
 * {@link ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS} (never merged with it) and sits
 * under the slot's own fields.
 *
 * @param slotId - A slot id of the entity
 * @returns A shared constant, the same object on every call for one role; undefined for a column's name or type and an id that is neither the title nor a column slot
 */
export const readErEntityTextSlotStyleDefaults = (
	slotId: string,
): TextSlotStyle | undefined => {
	if (slotId === ER_ENTITY_NAME_TEXT_SLOT_ID) {
		return ER_ENTITY_NAME_TEXT_SLOT_STYLE;
	}
	return parseErEntityColumnTextSlotId(slotId)?.field === "key"
		? ER_ENTITY_KEY_TEXT_SLOT_STYLE
		: undefined;
};

/**
 * The entity's slot-style declaration (`ObjectDocDefinition.textSlotStyleDefaults`):
 * {@link readErEntityTextSlotStyleDefaults} for the slots with a role,
 * {@link ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS} for the rest. Registered by the doc
 * definition and read headlessly by {@link resolveErEntityTextSlotStyle}.
 */
export const ER_ENTITY_TEXT_SLOT_STYLE_DECLARATION: ObjectTextSlotStyleDefaults =
	{
		everyTextSlot: ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS,
		byTextSlot: readErEntityTextSlotStyleDefaults,
	};

/**
 * The typography one slot of an entity is drawn with: the slot's own fields over
 * {@link ER_ENTITY_TEXT_SLOT_STYLE_DECLARATION} read for the slot, through the
 * same `readTextSlotStyleDefaults` the canvas's registry resolves it with. What
 * the layout measures with, so the rows are sized for the text the overlay
 * draws.
 *
 * @param source - The entity; the slot itself is read off its `text`, absent resolving as an unstyled slot
 * @param slotId - Which slot
 * @returns A fresh style object; `fontSize`, `fontWeight`, the alignment and `fontColor` are always set, `fontFamily` only where the slot states one
 */
export const resolveErEntityTextSlotStyle = (
	source: ErEntityTextSlots,
	slotId: string,
): TextSlotStyle =>
	resolveTextSlotStyle(
		readTextSlotStyleDefaults(ER_ENTITY_TEXT_SLOT_STYLE_DECLARATION, slotId),
		source.text?.[slotId],
	);

/**
 * The font one slot of an entity is measured with: its resolved typography
 * ({@link resolveErEntityTextSlotStyle}) with the family filled in.
 *
 * @param source - The entity, as for {@link resolveErEntityTextSlotStyle}
 * @param slotId - Which slot
 * @returns The font; the family is the canvas default where the slot states none
 */
export const resolveErEntityTextSlotFont = (
	source: ErEntityTextSlots,
	slotId: string,
): TextMeasureFont => {
	const style = resolveErEntityTextSlotStyle(source, slotId);
	return {
		fontSize: style.fontSize ?? ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS.fontSize,
		fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight:
			style.fontWeight ?? ER_ENTITY_TEXT_SLOT_STYLE_DEFAULTS.fontWeight,
		...(style.fontStyle !== undefined && { fontStyle: style.fontStyle }),
	};
};
