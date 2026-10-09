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
 *
 * The three toggles carry no value: the entry reads the current one and flips it.
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
	| { kind: "textAlign"; align: TextAlign }
	| { kind: "verticalAlign"; align: VerticalAlign }
	| { kind: "toggleBold" }
	| { kind: "toggleItalic" }
	| { kind: "toggleUnderline" }
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
 * entry is what reads the value (fieldEntry).
 */
export type ExtraStyleIntent = {
	/** The declared kind, dots and all ("label.fill"). */
	kind: string;
	/**
	 * The value, in whatever form the surface that raised it holds: the transport
	 * string where all it had was a name and a string (styleIntentOf), or the
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
 * Which field each toggle flips: the one fact that makes a toggle one, stated
 * once for the types (StyleIntentValueType, TextToggleIntentKind) and the entries
 * (toggleRunOrSlot) alike. A toggle's value type is its field's, so the two
 * cannot drift apart.
 */
export const TOGGLE_FLIPS = {
	toggleBold: "fontWeight",
	toggleItalic: "fontStyle",
	toggleUnderline: "textDecoration",
} as const satisfies Record<string, CoreStyleIntentKind>;

/**
 * The intents a keystroke in the text editor raises (TextEditor's Ctrl/Cmd+B/I/U
 * and the browser's own formatBold / formatItalic / formatUnderline edits). Spelled
 * in the intent vocabulary all the way from the keystroke, so nothing translates
 * a "bold" into the field it flips twice.
 */
export type TextToggleIntentKind = Extract<
	CoreStyleIntentKind,
	keyof typeof TOGGLE_FLIPS
>;

/**
 * A toggle as an intent: the kind and nothing else. Spelled out because an
 * object literal built from a `TextToggleIntentKind` is assignable to this
 * three-member union but not to the whole CoreStyleIntent one.
 */
export type TextToggleIntent = Extract<
	CoreStyleIntent,
	{ kind: TextToggleIntentKind }
>;

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
 * A toggle carries no value, but its entry reads and writes the field it flips
 * (TOGGLE_FLIPS), so it works in that field's value — which, every flipped field
 * being a text-slot one, already admits the unset the toggle also has nothing to
 * hand the entry.
 *
 * A name outside the core vocabulary is a kind its declaring type owns
 * (ObjectTypeDefinition.styleEntries), whose stored type the engine does not know:
 * `unknown`. A row holding that declaration reads it typed through the table
 * instead (StyleEntryValueType).
 */
export type StyleIntentValueType<K extends string> =
	K extends TextToggleIntentKind
		? CoreStyleIntentPayloadValue<(typeof TOGGLE_FLIPS)[K]> | undefined
		: K extends TextSlotStyleIntentKind
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
 * @returns The payload value, or undefined for an intent carrying none (the toggles)
 */
export const styleIntentValue = (intent: StyleIntent): unknown => {
	const { kind: _kind, ...payload } = intent;
	return Object.values(payload)[0];
};
