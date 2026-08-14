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
 * creation-time value that the factory substitutes the host theme's into
 * (`pickSupportedDocDefaults`), and an unset family is drawn and measured in the
 * theme's family throughout. Reading the built-in family here would pin every
 * shape whose author set no family to it and make a host theme's font
 * unreachable for hand-authored documents.
 */
const TEXT_STYLE_DEFAULT_KEYS = TEXT_SLOT_STYLE_KEYS.filter(
	(key) => key !== "fontFamily",
);

/**
 * Reads a type's text-style defaults out of the creation defaults it already
 * declares (`ObjectDocDefinition.defaults`), so a type gets its draw-time
 * defaults from the same place its factory materializes them from and the two
 * cannot diverge.
 *
 * Only a `features.text: "body"` type is read: its defaults spell the single
 * body's styling out flat on the doc (TextStyleDoc), which is exactly one slot's
 * worth. A `"slots"` type keys its styling per slot instead, so there is no
 * single answer to extract and its mapper is what fills a parsed doc in
 * (the record's RECORD_SLOT_STYLE_DEFAULTS_BY_ID).
 *
 * @param features - The type's feature flags; anything but `text: "body"` yields undefined
 * @param defaults - The type's creation defaults (its `*_DOC_DEFAULTS`); undefined for a type that declares none
 * @returns The style fields the defaults set, `fontFamily` excluded (see {@link TEXT_STYLE_DEFAULT_KEYS}), or undefined when they set none — the value `register` is meant to be handed
 */
export const extractTextSlotStyleDefaults = (
	features: ObjectFeatures,
	defaults: Readonly<Record<string, unknown>> | undefined,
): TextSlotStyle | undefined => {
	if (features.text !== "body" || defaults === undefined) {
		return undefined;
	}
	const style: Record<string, unknown> = {};
	for (const key of TEXT_STYLE_DEFAULT_KEYS) {
		const value = defaults[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return Object.keys(style).length === 0 ? undefined : style;
};

/**
 * Per-type text-style defaults: what a slot field falls back to when the author
 * left it unset. Registered from each type's `ObjectDocDefinition.defaults`
 * (`extractTextSlotStyleDefaults`) so the answer is the type's own, and read by
 * every side that draws, edits, measures or reports a text style.
 *
 * A type registered here contributes nothing to what is saved: the resolution
 * happens per read (`resolveSlotStyle`) and never writes back into the doc or
 * the state, so a field the author omitted stays omitted on the next save.
 *
 * A type absent from the registry resolves to the slot's own fields alone, which
 * leaves the shared components' last resort (TEXT_STYLE_FALLBACK) in charge.
 */
export class ObjectTextStyleDefaultsRegistry {
	private readonly defaultsByType = new Map<ObjectType, TextSlotStyle>();

	register(type: ObjectType, defaults: TextSlotStyle): void {
		this.defaultsByType.set(type, defaults);
	}

	/** The type's own defaults, or undefined when it declares none. */
	get(type: ObjectType): TextSlotStyle | undefined {
		return this.defaultsByType.get(type);
	}

	/**
	 * The styling one slot of the given type is drawn with: the slot's own fields
	 * over the type's defaults (see {@link resolveTextSlotStyle}).
	 *
	 * @param type - The object type the slot belongs to; one with nothing registered contributes no defaults
	 * @param slot - The slot, or its style half; undefined yields the type's defaults alone
	 * @returns A style object; a field neither side sets stays absent
	 */
	resolveSlotStyle(
		type: ObjectType,
		slot: TextSlot | TextSlotStyle | undefined,
	): TextSlotStyle {
		return resolveTextSlotStyle(this.defaultsByType.get(type), slot);
	}

	clear(): void {
		this.defaultsByType.clear();
	}
}

export const createObjectTextStyleDefaultsRegistry =
	(): ObjectTextStyleDefaultsRegistry => new ObjectTextStyleDefaultsRegistry();
