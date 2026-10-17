import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { TextVerticalBasis } from "@jiscribe/doc/model/objects/types/text/TextVerticalBasis";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

/**
 * What a style edit means, as the surface that asks for it states it: "paint the
 * face", "thicken the line", "redden the letters", paired with the value in its
 * own type. Where it lands is the answer of whichever type is addressed
 * (StyleTable) — an intent names no field of any document.
 *
 * The core kinds, every one of them declared here: the vocabulary the engine
 * derives from a type's features, and what the entries of `coreStyleTable` /
 * `textStyleTable` answer for. Which of them a type actually answers for is what
 * its table says.
 */
export type CoreStyleIntent =
	| { kind: "fill"; color: string }
	| { kind: "fillOpacity"; opacity: number }
	| { kind: "stroke"; color: string }
	| { kind: "strokeWidth"; width: number }
	| { kind: "strokeDashType"; dash: StrokeDashType }
	| { kind: "strokeOpacity"; opacity: number }
	| { kind: "cornerRadius"; radius: number }
	| { kind: "startArrow"; arrow: ArrowType }
	| { kind: "endArrow"; arrow: ArrowType }
	| { kind: "fontColor"; color: string }
	| { kind: "fontSize"; size: number }
	| { kind: "fontFamily"; family: string }
	/** The weight as a CSS `font-weight` value, the way TextEmphasisStyle holds it. */
	| { kind: "fontWeight"; weight: string }
	/** The style as a CSS `font-style` value ("normal" / "italic"). */
	| { kind: "fontStyle"; style: string }
	/** The decoration lines, space-separated when both apply ("none" for neither). */
	| { kind: "textDecoration"; decoration: string }
	/**
	 * The underline put on (`on: true`) or taken off every place the edit
	 * reaches, each place keeping whatever strikethrough it carries — stored in
	 * `textDecoration` alongside it rather than as a field of its own.
	 */
	| { kind: "underline"; on: boolean }
	/** The strikethrough put on or taken off, each place keeping its own underline (see `underline`). */
	| { kind: "strikethrough"; on: boolean }
	| { kind: "textAlign"; align: TextAlign }
	| { kind: "verticalAlign"; align: VerticalAlign }
	| { kind: "lockAspectRatio"; locked: boolean }
	| { kind: "textVerticalBasis"; basis: TextVerticalBasis }
	| { kind: "textContent"; text: string };

/** The name of one core style intent, the key a type's StyleTable answers under. */
export type CoreStyleIntentKind = CoreStyleIntent["kind"];

/**
 * A style edit addressed to a kind the core vocabulary does not hold: one a
 * type declares in its own table (ObjectTypeDefinition.styleEntries), which reaches the
 * types that declared it and no others.
 *
 * The engine knows nothing of what such a kind means, so the declaring type's
 * entry is what reads the value (declaredFieldEntry).
 */
export type ExtraStyleIntent = {
	/** The declared kind, dots and all ("label.fill"). */
	kind: string;
	/**
	 * The value, in whatever form the surface that raised it holds: the transport
	 * string where all it had was a name and a string (toStyleIntent), or the
	 * value already typed where the surface holds the declaration
	 * (`{ kind: "headerHeight", value: 32 }`). The engine cannot tell which,
	 * hence `unknown` — the entry reads it.
	 */
	value: unknown;
};

/**
 * The whole of what a surface raises and `applyStyleIntent` takes: a core kind
 * arrives as its own payload, a kind a type declared for itself as
 * `{ kind, value }`.
 */
export type StyleIntent = CoreStyleIntent | ExtraStyleIntent;

/**
 * The intents stored on a text slot, named after the field each of them is: the
 * core vocabulary and a slot's typography (`TextSlotStyle`) agree on these
 * eight names, so the set is their intersection rather than a second list to
 * keep in step.
 *
 * What singles them out is that **unset is one of their values**: a slot neither
 * setting the field nor having a type default for it is drawn with the reader's
 * own last resort (TEXT_STYLE_FALLBACK), and two such slots agree rather than
 * disagreeing — so `undefined` belongs in their value type
 * (StyleIntentValueType) and the entries report it as the value it is.
 */
export type TextSlotStyleIntentKind = Extract<
	CoreStyleIntentKind,
	keyof TextSlotStyle
>;

/**
 * Every kind the text half of a type's table can answer for (textStyleTable),
 * whatever its text type: the typography and the content.
 * What a pick of a text slot receives (createTextSlotPartKindDefinition), and the
 * kinds a part reaching text declares among its own (`styleIntentKinds`). A
 * `"source"` type answers for fewer of them, its menu offering none of the rest
 * to begin with.
 */
export const TEXT_STYLE_INTENT_KINDS: ReadonlySet<CoreStyleIntentKind> =
	new Set<CoreStyleIntentKind>([
		"textContent",
		"fontColor",
		"fontSize",
		"fontFamily",
		"fontWeight",
		"fontStyle",
		"textDecoration",
		"underline",
		"strikethrough",
		"textAlign",
		"verticalAlign",
	]);

/** Everything a core intent of one kind holds besides its name. */
type CoreStyleIntentPayload<K extends CoreStyleIntentKind> = Omit<
	Extract<CoreStyleIntent, { kind: K }>,
	"kind"
>;

/**
 * The value a core intent of one kind carries: the sole field its payload holds.
 *
 * @template K - The kind whose payload is read
 */
type CoreStyleIntentPayloadValue<K extends CoreStyleIntentKind> =
	CoreStyleIntentPayload<K>[keyof CoreStyleIntentPayload<K>];

/**
 * The type of the value an intent of one kind carries: the sole field it holds
 * besides `kind`. What the entries of that kind apply and read, so the two sides
 * cannot disagree on it — and what a row reading the selection gets back
 * (readSelectionStyle).
 *
 * A text-slot kind (TextSlotStyleIntentKind) carries `undefined` with it: unset
 * is a value such a field really has, and the entry reports it rather than
 * standing in a default of its own.
 *
 * A name outside the core vocabulary is a kind its declaring type owns
 * (ObjectTypeDefinition.styleEntries), whose stored type the engine does not know:
 * `unknown`. A row holding that declaration reads it typed through the table
 * instead (StyleEntryValueType).
 */
export type StyleIntentValueType<K extends string> =
	K extends TextSlotStyleIntentKind
		? CoreStyleIntentPayloadValue<K> | undefined
		: K extends CoreStyleIntentKind
			? CoreStyleIntentPayloadValue<K>
			: unknown;

/**
 * The value an intent carries, erased: the walkers look an entry up by a kind
 * they only know at runtime, so the value cannot be tied to the entry's type
 * statically (applyStyleIntent casts the entry to match).
 *
 * @param intent - The intent to read; the payload field is named differently per kind (`value` for a type's own), and taken as the only one besides `kind`
 * @returns The payload value
 */
export const styleIntentValue = (intent: StyleIntent): unknown => {
	const { kind: _kind, ...payload } = intent;
	return Object.values(payload)[0];
};
