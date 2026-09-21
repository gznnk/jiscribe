import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectType } from "../model/objects/types/ObjectType";
import type {
	TextSlot,
	TextSlotStyle,
} from "../model/objects/types/text/TextSlot";
import { resolveTextSlotStyle } from "../model/objects/types/text/TextSlot";
import type { TextType } from "../model/objects/types/text/TextType";
import {
	isSingleBodyText,
	textStyleKeysOf,
} from "../model/objects/types/text/TextType";
import { pickDefined } from "../model/objects/utils/pickDefined";
import { BODY_TEXT_SLOT_ID } from "../text/style/textSlotId";

/**
 * The style fields a type's defaults are read for: what its text type accepts
 * at all ({@link textStyleKeysOf}), less `fontFamily`.
 *
 * `fontFamily` is deliberately left out. A type's default family is a
 * creation-time value the factory writes into the doc, while an unset family
 * resolves to DEFAULT_FONT_FAMILY wherever it is drawn or measured. Reading a
 * type's own default here would make a hand-authored doc of that type resolve to
 * a different family than every other unstyled slot on the canvas.
 */
const textStyleDefaultKeys = (
	textType: TextType | undefined,
): (keyof TextSlotStyle)[] =>
	textStyleKeysOf(textType).filter((key) => key !== "fontFamily");

/**
 * A type's text-style defaults, keyed by the slot id they apply to. A root-form
 * type (`"body"` / `"source"`) declares the one key every single-text shape
 * holds ({@link BODY_TEXT_SLOT_ID}); a `"slots"` type declares one entry per
 * slot of its own set, a slot left out here contributing no defaults.
 */
export type ObjectTextSlotStyleDefaults = Readonly<
	Record<string, TextSlotStyle>
>;

/**
 * The per-slot draw-time defaults of one type, from whichever of its two
 * declarations applies.
 *
 * A root-form type (`features.text: "body"` / `"source"`) is read out of the
 * creation defaults it already declares (`ObjectDocDefinition.defaults`), which
 * spell the single body's styling out flat on the doc (TextStyleDoc) — exactly
 * one slot's worth — so a type gets its draw-time defaults from the same place
 * its factory materializes them from and the two cannot diverge. A `"source"`
 * type is read for the narrower set its text type accepts, so an emphasis value left
 * in its creation defaults contributes nothing. A `"slots"` type keys its styling per
 * slot, which no flat doc field can hold, so it declares the map itself
 * (`ObjectDocDefinition.textSlotStyleDefaults`; the record's
 * RECORD_SLOT_STYLE_DEFAULTS_BY_ID).
 *
 * @param features - The type's feature flags; one with no text at all yields undefined
 * @param defaults - The type's creation defaults (its `*_DOC_DEFAULTS`); read for a root-form type only, undefined for a type that declares none
 * @param slotStyleDefaults - The type's per-slot declaration; read for a `"slots"` type only, undefined for a type that declares none
 * @returns The defaults keyed by slot id, or undefined when nothing is declared — the value `register` is meant to be handed
 */
export const extractTextSlotStyleDefaults = (
	features: ObjectFeatures,
	defaults: Readonly<Record<string, unknown>> | undefined,
	slotStyleDefaults?: ObjectTextSlotStyleDefaults,
): ObjectTextSlotStyleDefaults | undefined => {
	if (isSingleBodyText(features.text)) {
		if (defaults === undefined) {
			return undefined;
		}
		// A root-form type spells the body's styling out flat on the doc, so its
		// creation defaults are read as that doc's style half.
		const bodyDefaults: Readonly<TextSlotStyle> = defaults;
		const bodyStyle = pickDefined(
			bodyDefaults,
			textStyleDefaultKeys(features.text),
		);
		return Object.keys(bodyStyle).length === 0
			? undefined
			: { [BODY_TEXT_SLOT_ID]: bodyStyle };
	}
	if (features.text !== "slots" || slotStyleDefaults === undefined) {
		return undefined;
	}
	const bySlotId: Record<string, TextSlotStyle> = {};
	for (const [slotId, slotDefaults] of Object.entries(slotStyleDefaults)) {
		const style = pickDefined(
			slotDefaults,
			textStyleDefaultKeys(features.text),
		);
		if (Object.keys(style).length > 0) {
			bySlotId[slotId] = style;
		}
	}
	return Object.keys(bySlotId).length === 0 ? undefined : bySlotId;
};

/**
 * Per-type, per-slot text-style defaults: what a slot field falls back to when
 * the author left it unset. Registered from each type's own declaration
 * (`extractTextSlotStyleDefaults`) so the answer is the type's own, and read by
 * every side that draws, edits, measures or reports a text style.
 *
 * A type registered here contributes nothing to what is saved: the resolution
 * happens per read (`resolveSlotStyle`) and never writes back into the doc or
 * the state, so a field the author omitted stays omitted on the next save.
 *
 * A type or slot absent from the registry resolves to the slot's own fields
 * alone, which leaves the shared components' last resort (TEXT_STYLE_FALLBACK)
 * in charge.
 */
export class ObjectTextStyleDefaultsRegistry {
	private readonly defaultsByType = new Map<
		ObjectType,
		ObjectTextSlotStyleDefaults
	>();

	register(type: ObjectType, defaults: ObjectTextSlotStyleDefaults): void {
		this.defaultsByType.set(type, defaults);
	}

	/**
	 * Registers whatever text-style defaults a type's definition declares
	 * ({@link extractTextSlotStyleDefaults}); a definition declaring none leaves
	 * the registry as it was.
	 *
	 * @param type - The object type the definition describes
	 * @param definition - The declaring half of an ObjectDocDefinition: its features, creation defaults and per-slot map
	 */
	registerDefinition(
		type: ObjectType,
		definition: {
			features: ObjectFeatures;
			defaults?: Readonly<Record<string, unknown>>;
			textSlotStyleDefaults?: ObjectTextSlotStyleDefaults;
		},
	): void {
		const defaults = extractTextSlotStyleDefaults(
			definition.features,
			definition.defaults,
			definition.textSlotStyleDefaults,
		);
		if (defaults !== undefined) {
			this.register(type, defaults);
		}
	}

	/**
	 * The defaults of one slot, or undefined when the type declares none for it.
	 *
	 * @param type - The object type the slot belongs to
	 * @param slotId - Which slot; a root-form type's single slot is BODY_TEXT_SLOT_ID
	 */
	get(type: ObjectType, slotId: string): TextSlotStyle | undefined {
		return this.defaultsByType.get(type)?.[slotId];
	}

	/**
	 * The styling one slot of the given type is drawn with: the slot's own fields
	 * over that slot's defaults (see {@link resolveTextSlotStyle}).
	 *
	 * @param type - The object type the slot belongs to; one with nothing registered contributes no defaults
	 * @param slotId - Which slot the defaults are taken from; a slot the type declares none for contributes none
	 * @param slot - The slot, or its style half; undefined yields the slot's defaults alone
	 * @returns A style object; a field neither side sets stays absent
	 */
	resolveSlotStyle(
		type: ObjectType,
		slotId: string,
		slot: TextSlot | TextSlotStyle | undefined,
	): TextSlotStyle {
		return resolveTextSlotStyle(this.get(type, slotId), slot);
	}

	clear(): void {
		this.defaultsByType.clear();
	}
}

export const createObjectTextStyleDefaultsRegistry =
	(): ObjectTextStyleDefaultsRegistry => new ObjectTextStyleDefaultsRegistry();
