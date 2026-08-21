import { BODY_TEXT_SLOT_ID } from "../../constants/textSlotId";
import type { ObjectFeatures } from "../objects/types/ObjectFeatures";
import type { ObjectType } from "../objects/types/ObjectType";
import type { TextSlot, TextSlotStyle } from "../objects/types/TextSlot";
import {
	resolveTextSlotStyle,
	TEXT_SLOT_STYLE_KEYS,
} from "../objects/types/TextSlot";

/**
 * The style fields a type's defaults are read for.
 *
 * `fontFamily` is deliberately left out. A type's default family is a
 * creation-time value the factory writes into the doc, while an unset family
 * resolves to DEFAULT_FONT_FAMILY wherever it is drawn or measured. Reading a
 * type's own default here would make a hand-authored doc of that type resolve to
 * a different family than every other unstyled slot on the canvas.
 */
const TEXT_STYLE_DEFAULT_KEYS = TEXT_SLOT_STYLE_KEYS.filter(
	(key) => key !== "fontFamily",
);

/**
 * A type's text-style defaults, keyed by the slot id they apply to. A `"body"`
 * type declares the one key every single-text shape holds
 * ({@link BODY_TEXT_SLOT_ID}); a `"slots"` type declares one entry per slot of
 * its own set, a slot left out here contributing no defaults.
 */
export type ObjectTextSlotStyleDefaults = Readonly<
	Record<string, TextSlotStyle>
>;

/** The style fields of `source` that are set, `fontFamily` excluded (see {@link TEXT_STYLE_DEFAULT_KEYS}), or undefined when it sets none. */
const pickStyleDefaults = (
	source: Readonly<Record<string, unknown>>,
): TextSlotStyle | undefined => {
	const style: Record<string, unknown> = {};
	for (const key of TEXT_STYLE_DEFAULT_KEYS) {
		const value = source[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return Object.keys(style).length === 0 ? undefined : style;
};

/**
 * The per-slot draw-time defaults of one type, from whichever of its two
 * declarations applies.
 *
 * A `features.text: "body"` type is read out of the creation defaults it already
 * declares (`ObjectDocDefinition.defaults`), which spell the single body's
 * styling out flat on the doc (TextStyleDoc) — exactly one slot's worth — so a
 * type gets its draw-time defaults from the same place its factory materializes
 * them from and the two cannot diverge. A `"slots"` type keys its styling per
 * slot, which no flat doc field can hold, so it declares the map itself
 * (`ObjectDocDefinition.textSlotStyleDefaults`; the record's
 * RECORD_SLOT_STYLE_DEFAULTS_BY_ID).
 *
 * @param features - The type's feature flags; one with no text at all yields undefined
 * @param defaults - The type's creation defaults (its `*_DOC_DEFAULTS`); read for a `"body"` type only, undefined for a type that declares none
 * @param slotStyleDefaults - The type's per-slot declaration; read for a `"slots"` type only, undefined for a type that declares none
 * @returns The defaults keyed by slot id, or undefined when nothing is declared — the value `register` is meant to be handed
 */
export const extractTextSlotStyleDefaults = (
	features: ObjectFeatures,
	defaults: Readonly<Record<string, unknown>> | undefined,
	slotStyleDefaults?: ObjectTextSlotStyleDefaults,
): ObjectTextSlotStyleDefaults | undefined => {
	if (features.text === "body") {
		if (defaults === undefined) {
			return undefined;
		}
		const bodyStyle = pickStyleDefaults(defaults);
		return bodyStyle === undefined
			? undefined
			: { [BODY_TEXT_SLOT_ID]: bodyStyle };
	}
	if (features.text !== "slots" || slotStyleDefaults === undefined) {
		return undefined;
	}
	const bySlotId: Record<string, TextSlotStyle> = {};
	for (const [slotId, slotDefaults] of Object.entries(slotStyleDefaults)) {
		const style = pickStyleDefaults(slotDefaults);
		if (style !== undefined) {
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
	 * The defaults of one slot, or undefined when the type declares none for it.
	 *
	 * @param type - The object type the slot belongs to
	 * @param slotId - Which slot; a `"body"` type's single slot is BODY_TEXT_SLOT_ID
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
