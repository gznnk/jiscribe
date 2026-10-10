import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { isTextVerticalBasis } from "@jiscribe/doc/model/objects/types/text/TextVerticalBasis";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

import { coerceStyleValue } from "./coerceStyleValue";
import type { CoreStyleIntent, StyleIntent } from "../StyleIntent";

/**
 * Every name a style property may carry that is not a shape's own declaration:
 * the fields of the style groups the doc declares, plus the three that no group
 * owns — the text content, and the two switches below.
 *
 * `INTENT_BY_PROPERTY` is checked against it, so a field added to a group fails
 * to compile until it is given a mapper, and a name no group owns is refused.
 *
 * Of the transform group only `lockAspectRatio` is named here: rotation and the
 * flips are moved through their own gestures and ops, never through a style
 * property, so listing them would demand mappers that nothing would reach. No
 * surface spells the lock as a property either — the sidebar's row runs
 * `toggleLockAspectRatio` — but it stays part of the vocabulary, and so of this
 * union.
 */
type SystemStyleName =
	| (typeof FILL_STYLE_KEYS)[number]
	| (typeof STROKE_STYLE_KEYS)[number]
	| (typeof RADIUS_STYLE_KEYS)[number]
	| (typeof TEXT_SLOT_STYLE_KEYS)[number]
	| (typeof ARROW_STYLE_KEYS)[number]
	/** The content rather than styling; it lives in the keyed slots, not in one field. */
	| "text"
	| "lockAspectRatio"
	/** Which box the body is placed against, a text field no style group owns. */
	| "textVerticalBasis";

/** What the menus' string value is read as, before the intent it makes is applied. */
type StyleIntentMapper = (value: string) => CoreStyleIntent | undefined;

/** The number the string carries, or undefined when it does not parse. */
const toStyleNumber = (value: string): number | undefined => {
	const coerced = coerceStyleValue("number", value);
	return typeof coerced === "number" ? coerced : undefined;
};

/**
 * A mapper for an intent whose value is a number, which applies nothing for a
 * string no number parses from.
 *
 * @param build - The intent the parsed number states; reached only for a string that parsed
 */
const numberIntent =
	(build: (value: number) => CoreStyleIntent): StyleIntentMapper =>
	(value) => {
		const parsed = toStyleNumber(value);
		return parsed === undefined ? undefined : build(parsed);
	};

/**
 * The property names the core style vocabulary owns, each paired with the intent
 * the menus' string value makes. Exhaustive over SystemStyleName, which is what
 * keeps every style field on exactly one route.
 *
 * A mapper returning undefined is a value nothing can be made of, which applies
 * nothing.
 *
 * The transport is a string either way, so the dash, the two arrowheads and the
 * two alignments are cast to their unions here rather than validated: the values
 * come from the menus' own parts. The basis is the exception, and it throws: no
 * surface outside the built-in rows states it, so a value that is neither
 * basis is a mistake in the engine rather than something to quietly apply
 * nothing for.
 */
const INTENT_BY_PROPERTY = {
	fill: (value) => ({ kind: "fill", color: value }),
	fillOpacity: numberIntent((opacity) => ({ kind: "fillOpacity", opacity })),
	stroke: (value) => ({ kind: "stroke", color: value }),
	strokeWidth: numberIntent((width) => ({ kind: "strokeWidth", width })),
	strokeDashType: (value) => ({
		kind: "strokeDashType",
		dash: value as StrokeDashType,
	}),
	strokeOpacity: numberIntent((opacity) => ({
		kind: "strokeOpacity",
		opacity,
	})),
	// The menus' part is named after the field the radius is stored in, the intent
	// after what it means.
	rx: numberIntent((radius) => ({ kind: "cornerRadius", radius })),
	startArrow: (value) => ({ kind: "startArrow", arrow: value as ArrowType }),
	endArrow: (value) => ({ kind: "endArrow", arrow: value as ArrowType }),
	fontColor: (value) => ({ kind: "fontColor", color: value }),
	fontSize: numberIntent((size) => ({ kind: "fontSize", size })),
	fontFamily: (value) => ({ kind: "fontFamily", family: value }),
	fontWeight: (value) => ({ kind: "fontWeight", weight: value }),
	fontStyle: (value) => ({ kind: "fontStyle", style: value }),
	textDecoration: (value) => ({ kind: "textDecoration", decoration: value }),
	textAlign: (value) => ({ kind: "textAlign", align: value as TextAlign }),
	verticalAlign: (value) => ({
		kind: "verticalAlign",
		align: value as VerticalAlign,
	}),
	text: (value) => ({ kind: "textContent", text: value }),
	lockAspectRatio: (value) => ({
		kind: "lockAspectRatio",
		locked: value === "true",
	}),
	textVerticalBasis: (value) => {
		if (!isTextVerticalBasis(value)) {
			throw new Error(
				`textVerticalBasis takes "region" or "frame", not ${JSON.stringify(value)}`,
			);
		}
		return { kind: "textVerticalBasis", basis: value };
	},
} satisfies Record<SystemStyleName, StyleIntentMapper>;

/**
 * The mapper for one property name, or undefined for a name the core vocabulary
 * does not own (a kind a type declares in its own style table).
 * Looked up through a cast because the record is exhaustive by type rather than
 * by index signature, which is what makes a new style field a compile error.
 *
 * @param property - The property name, as the menus' parts spell it
 */
const intentMapperOf = (property: string): StyleIntentMapper | undefined =>
	(INTENT_BY_PROPERTY as Record<string, StyleIntentMapper | undefined>)[
		property
	];

/**
 * The one reading of a property name and a string value — the form the DOM
 * carries them in (`set:fill:#f00`, `slider:strokeWidth`, a color typed into a
 * picker) — into the intent they state.
 *
 * Both surfaces that write a style end at `applyStyleIntent`, and this is what
 * either of them calls when all it holds is a name and a string: the gesture
 * route for a `set:` / `slider:` part (applyStyleAction), and a widget of
 * the React route that reads its value off the DOM. A row that knows its
 * property statically states the intent outright instead and never comes here.
 *
 * A name the core vocabulary does not own is a kind some type declares in its
 * own table, and is passed on under that very name for the types' tables to
 * answer (ObjectTypeDefinition.styleEntries); a name nobody declares therefore applies
 * to nothing (fail-closed).
 *
 * @param property - The property name, as the menus' parts spell it; a name with dots in it is a declared write path (`label.fill`)
 * @param value - The value as a string, read into the intent's own type (INTENT_BY_PROPERTY) or left as it stands for the declaring type's entry to read
 * @returns The intent to apply, or undefined for a value nothing can be made of (a string no number parses from) — which is the caller's cue to apply nothing
 * @throws For a `textVerticalBasis` value that is neither basis: only the built-in rows state that property, so such a value is a mistake in the engine and is not quietly turned into applying nothing
 */
export const toStyleIntent = (
	property: string,
	value: string,
): StyleIntent | undefined => {
	const toIntent = intentMapperOf(property);
	return toIntent === undefined ? { kind: property, value } : toIntent(value);
};
