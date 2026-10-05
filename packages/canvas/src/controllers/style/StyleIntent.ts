import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { TextVerticalBasis } from "@jiscribe/doc/model/objects/types/text/TextVerticalBasis";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

/**
 * What a style edit means, as the surface that asks for it states it: "paint the
 * face", "thicken the line", "redden the letters", paired with the value in its
 * own type. Where it lands is the answer of whichever type is addressed
 * (StyleTable) — an intent names no field of any document.
 *
 * Every kind is declared here, the whole vocabulary in one place; which of them
 * a type actually answers for is what its table says. Only `fill` and the
 * typography have entries so far (coreStyleTable) — the rest are still written
 * through StylePropertyRegistry and move over one kind at a time.
 *
 * The three toggles carry no value: the entry reads the current one and flips it.
 */
export type StyleIntent =
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

/** The name of one style intent, the key a type's StyleTable answers under. */
export type StyleIntentKind = StyleIntent["kind"];

/** Everything an intent of one kind holds besides its name. */
type StyleIntentPayload<K extends StyleIntentKind> = Omit<
	Extract<StyleIntent, { kind: K }>,
	"kind"
>;

/**
 * The value a toggle's entry works in: the field it flips — a CSS `font-weight`,
 * `font-style` or `text-decoration` — which is what its `read` reports and what
 * its `apply` computes for itself. `undefined` belongs to it twice over: a slot
 * setting none of those reads as unset, and the intent carries no value for the
 * walker to hand the entry (see toggleRunOrSlot).
 */
export type ToggleStyleValue = string | undefined;

/**
 * The value an intent of one kind carries: the sole field it holds besides
 * `kind`. What the entries of that kind apply and read, so the two sides cannot
 * disagree on the type.
 *
 * A kind carrying nothing is one of the toggles, whose entries work in
 * {@link ToggleStyleValue}: the intent names no value, but there is still a field
 * to read and write.
 */
export type StyleValueOf<K extends StyleIntentKind> = [
	keyof StyleIntentPayload<K>,
] extends [never]
	? ToggleStyleValue
	: StyleIntentPayload<K>[keyof StyleIntentPayload<K>];

/**
 * The value an intent carries, erased: the walkers look an entry up by a kind
 * they only know at runtime, so the value cannot be tied to the entry's type
 * statically (applyStyleIntent casts the entry to match).
 *
 * @param intent - The intent to read; the payload field is named differently per kind, and taken as the only one besides `kind`
 * @returns The payload value, or undefined for an intent carrying none (the toggles)
 */
export const styleIntentValue = (intent: StyleIntent): unknown => {
	const { kind: _kind, ...payload } = intent;
	return Object.values(payload)[0];
};
