import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectType } from "../model/objects/types/ObjectType";
import type {
	TextSlot,
	TextSlotStyle,
} from "../model/objects/types/text/TextSlot";
import {
	resolveTextSlotStyle,
	BODY_TEXT_SLOT_ID,
} from "../model/objects/types/text/TextSlot";
import type { TextType } from "../model/objects/types/text/TextType";
import {
	isSingleBodyText,
	textStyleKeysOf,
} from "../model/objects/types/text/TextType";
import { pickDefined } from "../model/objects/utils/pickDefined";

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
 * A type's text-style defaults, in the two kinds a type may have: named slots it
 * knows the ids of, and one entry for every slot at once. They are separate
 * fields rather than one map keyed by slot id, so that neither kind has to
 * reserve an id the other could not then be a slot of.
 *
 * A root-form type (`"body"` / `"source"`) declares `byTextSlot` under the one key
 * every single-text shape holds ({@link BODY_TEXT_SLOT_ID}). A `"slots"` type
 * declares `byTextSlot` for the slots of its own fixed set, a slot left out
 * contributing no defaults; one whose slot set is not fixed — a table's cells are
 * one per row × column, so there is no list of ids — declares `everyTextSlot`
 * instead, which every slot without its own entry falls back to. One whose slot
 * ids are not fixed but still say the slot's role (`col:<i>:key`) declares
 * `byTextSlot` as a function of the id.
 */
export type ObjectTextSlotStyleDefaults = Readonly<{
	/**
	 * Defaults of the slots the type names: a map keyed by slot id, or a function
	 * giving the style for one id (undefined for a slot it has none for). A
	 * function sees the id alone, never the object, and has to be pure: the same
	 * style for the same id and no side effect, at best one shared constant per
	 * role, since a reader may compare styles by reference. A map is narrowed to
	 * the style fields at registration, a function's style by the registry as it is
	 * read.
	 */
	byTextSlot?:
		| Readonly<Record<string, TextSlotStyle>>
		| ((slotId: string) => TextSlotStyle | undefined);
	/** Defaults every slot without an entry of its own falls back to. */
	everyTextSlot?: TextSlotStyle;
}>;

/**
 * The fields of `style` a slot default may set (`styleKeys`, from
 * {@link textStyleDefaultKeys}); undefined when it sets none of them.
 */
const pickTextStyleDefaults = (
	style: TextSlotStyle,
	styleKeys: (keyof TextSlotStyle)[],
): TextSlotStyle | undefined => {
	const picked = pickDefined(style, styleKeys);
	return Object.keys(picked).length > 0 ? picked : undefined;
};

/**
 * One slot's defaults read off a declaration, the style a function `byTextSlot`
 * gives for the slot put through `readSlotStyle` first: the slot's own entry (or
 * the function's style) or else `everyTextSlot`, the two never merged. The one
 * statement of that order, read as declared by {@link readTextSlotStyleDefaults}
 * and picked by the registry.
 */
const readDeclaredSlotStyle = (
	defaults: ObjectTextSlotStyleDefaults | undefined,
	slotId: string,
	readSlotStyle: (slotStyle: TextSlotStyle) => TextSlotStyle | undefined,
): TextSlotStyle | undefined => {
	const byTextSlot = defaults?.byTextSlot;
	if (typeof byTextSlot === "function") {
		const slotStyle = byTextSlot(slotId);
		return (
			(slotStyle === undefined ? undefined : readSlotStyle(slotStyle)) ??
			defaults?.everyTextSlot
		);
	}
	return byTextSlot?.[slotId] ?? defaults?.everyTextSlot;
};

/** The style a function `byTextSlot` gives, taken as declared. */
const readSlotStyleAsDeclared = (slotStyle: TextSlotStyle): TextSlotStyle =>
	slotStyle;

/**
 * One slot's defaults read off a declaration, in the order every reader lays
 * them: the slot's own `byTextSlot` entry, or else `everyTextSlot`. A type that
 * resolves its own slots headlessly (a layout measuring a document) reads its
 * declaration through this, in the order the registry's `get` reads a registered
 * one, so the two cannot drift apart. Pure as long as the declaration's function
 * `byTextSlot` is.
 *
 * @param defaults - The type's declaration, or undefined for a type that declares none
 * @param slotId - Which slot; its own entry in `byTextSlot` (or the style a function gives for it) wins over `everyTextSlot`, the two never merged
 * @returns The declared object itself, a function's style included, as declared and not narrowed (the registry picks the style fields of the ones it is asked for); undefined when nothing is declared for the slot
 */
export const readTextSlotStyleDefaults = (
	defaults: ObjectTextSlotStyleDefaults | undefined,
	slotId: string,
): TextSlotStyle | undefined =>
	readDeclaredSlotStyle(defaults, slotId, readSlotStyleAsDeclared);

/** A `byTextSlot` map narrowed to `styleKeys`, a slot setting none dropped; undefined when none is left. */
const narrowTextSlotStyleMap = (
	byTextSlot: Readonly<Record<string, TextSlotStyle>>,
	styleKeys: (keyof TextSlotStyle)[],
): Record<string, TextSlotStyle> | undefined => {
	const narrowed: Record<string, TextSlotStyle> = {};
	for (const [slotId, slotDefaults] of Object.entries(byTextSlot)) {
		const style = pickTextStyleDefaults(slotDefaults, styleKeys);
		if (style !== undefined) {
			narrowed[slotId] = style;
		}
	}
	return Object.keys(narrowed).length > 0 ? narrowed : undefined;
};

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
 * in its creation defaults contributes nothing. A `"slots"` type styles each slot
 * on its own, which no flat doc field can hold, so it declares them itself
 * (`ObjectDocDefinition.textSlotStyleDefaults`; the record's
 * RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID under `byTextSlot`).
 *
 * @param features - The type's feature flags; one with no text at all yields undefined
 * @param defaults - The type's creation defaults (its `*_DOC_DEFAULTS`); read for a root-form type only, undefined for a type that declares none
 * @param slotStyleDefaults - The type's per-slot declaration; read for a `"slots"` type only, undefined for a type that declares none
 * @returns The defaults in the same two-field shape, each map narrowed to the style fields and dropped when it sets none, a function `byTextSlot` carried as declared; undefined when nothing is left — the value `register` is meant to be handed
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
			: { byTextSlot: { [BODY_TEXT_SLOT_ID]: bodyStyle } };
	}
	if (features.text !== "slots" || slotStyleDefaults === undefined) {
		return undefined;
	}
	const styleKeys = textStyleDefaultKeys(features.text);
	const declaredByTextSlot = slotStyleDefaults.byTextSlot;
	const byTextSlot: ObjectTextSlotStyleDefaults["byTextSlot"] =
		typeof declaredByTextSlot === "function"
			? declaredByTextSlot
			: narrowTextSlotStyleMap(declaredByTextSlot ?? {}, styleKeys);
	const everyTextSlot =
		slotStyleDefaults.everyTextSlot === undefined
			? undefined
			: pickTextStyleDefaults(slotStyleDefaults.everyTextSlot, styleKeys);
	if (byTextSlot === undefined && everyTextSlot === undefined) {
		return undefined;
	}
	return {
		...(byTextSlot !== undefined && { byTextSlot }),
		...(everyTextSlot !== undefined && { everyTextSlot }),
	};
};

/**
 * Per-type, per-slot text-style defaults: what a slot field falls back to when
 * the author left it unset. Registered from each type's own declaration
 * (`extractTextSlotStyleDefaults`) so the answer is the type's own, and read by
 * every side that draws, edits, measures or reports a text style.
 *
 * A type registered here contributes nothing to what is saved: the resolution
 * happens per read (`resolveTextSlotStyle`) and never writes back into the doc or
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

	/**
	 * What {@link pickTextStyleDefaults} took out of each style a function
	 * `byTextSlot` gave, keyed by that style, so a style that is one shared
	 * constant reads back as one object however often it is asked for, as a map
	 * entry picked at registration does.
	 */
	private readonly pickedTextStyleDefaultsCache = new WeakMap<
		TextSlotStyle,
		TextSlotStyle | undefined
	>();

	/**
	 * The style fields of a style a function `byTextSlot` gave, picked as a map
	 * entry is at registration: from the cache when this style was picked before,
	 * otherwise picked now and cached. Undefined when it sets no style field.
	 */
	private readonly readPickedTextStyleDefaults = (
		slotStyle: TextSlotStyle,
	): TextSlotStyle | undefined => {
		if (this.pickedTextStyleDefaultsCache.has(slotStyle)) {
			return this.pickedTextStyleDefaultsCache.get(slotStyle);
		}
		const picked = pickTextStyleDefaults(
			slotStyle,
			textStyleDefaultKeys("slots"),
		);
		this.pickedTextStyleDefaultsCache.set(slotStyle, picked);
		return picked;
	};

	register(type: ObjectType, defaults: ObjectTextSlotStyleDefaults): void {
		this.defaultsByType.set(type, defaults);
	}

	/**
	 * Registers whatever text-style defaults a type's definition declares
	 * ({@link extractTextSlotStyleDefaults}); a definition declaring none leaves
	 * the registry as it was.
	 *
	 * @param type - The object type the definition describes
	 * @param definition - The declaring half of an ObjectDocDefinition: its features, creation defaults and text-style declaration
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
	 * The defaults of one slot, or undefined when the type declares none for it
	 * through either field of {@link ObjectTextSlotStyleDefaults}, read in the
	 * order {@link readTextSlotStyleDefaults} reads one, the style a function
	 * gives picked to the style fields.
	 *
	 * @param type - The object type the slot belongs to
	 * @param slotId - Which slot; a root-form type's single slot is BODY_TEXT_SLOT_ID. Its own entry in `byTextSlot` wins over `everyTextSlot`
	 * @returns The registered entry itself, or for a function `byTextSlot` the picked style — the same object on every read of one style it gives
	 */
	get(type: ObjectType, slotId: string): TextSlotStyle | undefined {
		return readDeclaredSlotStyle(
			this.defaultsByType.get(type),
			slotId,
			this.readPickedTextStyleDefaults,
		);
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
	resolveTextSlotStyle(
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
