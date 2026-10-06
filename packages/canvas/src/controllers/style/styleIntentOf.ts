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
import type { ExtraStyleIntent, StyleIntent } from "./StyleIntent";

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
type StyleIntentMapper = (value: string) => StyleIntent | undefined;

/** The number the string carries, or undefined when it does not parse. */
const toStyleNumber = (value: string): number | undefined => {
	const coerced = coerceStyleValue("number", value);
	return typeof coerced === "number" ? coerced : undefined;
};

/**
 * The property names the engine's own style vocabulary owns, each paired with the
 * intent the menus' string value makes. Exhaustive over SystemStyleName, which is
 * what keeps every style field on exactly one route.
 *
 * A mapper returning undefined is a value nothing can be made of, which applies
 * nothing.
 *
 * The transport is a string either way, so the dash, the two arrowheads and the
 * two alignments are cast to their unions here rather than validated: the values
 * come from the menus' own parts. The basis is the exception, having always been
 * checked.
 */
const INTENT_BY_PROPERTY = {
	fill: (value) => ({ kind: "fill", color: value }),
	fillOpacity: (value) => {
		const opacity = toStyleNumber(value);
		return opacity === undefined ? undefined : { kind: "fillOpacity", opacity };
	},
	stroke: (value) => ({ kind: "stroke", color: value }),
	strokeWidth: (value) => {
		const width = toStyleNumber(value);
		return width === undefined ? undefined : { kind: "strokeWidth", width };
	},
	strokeDashType: (value) => ({
		kind: "strokeDashType",
		dash: value as StrokeDashType,
	}),
	strokeOpacity: (value) => {
		const opacity = toStyleNumber(value);
		return opacity === undefined
			? undefined
			: { kind: "strokeOpacity", opacity };
	},
	// The menus' part is named after the field the radius is stored in, the intent
	// after what it means.
	rx: (value) => {
		const radius = toStyleNumber(value);
		return radius === undefined ? undefined : { kind: "cornerRadius", radius };
	},
	startArrow: (value) => ({ kind: "startArrow", arrow: value as ArrowType }),
	endArrow: (value) => ({ kind: "endArrow", arrow: value as ArrowType }),
	fontColor: (value) => ({ kind: "fontColor", color: value }),
	fontSize: (value) => {
		const size = toStyleNumber(value);
		return size === undefined ? undefined : { kind: "fontSize", size };
	},
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
 * The mapper for one property name, or undefined for a name the engine's own
 * vocabulary does not own (a shape's own ExtraStyleProperty). Looked up through a
 * cast because the record is exhaustive by type rather than by index signature,
 * which is what makes a new style field a compile error.
 *
 * @param property - The property name, as the menus' parts spell it
 */
const intentMapperOf = (property: string): StyleIntentMapper | undefined =>
	(INTENT_BY_PROPERTY as Record<string, StyleIntentMapper | undefined>)[
		property
	];

/**
 * Whether a name belongs to the engine's own style vocabulary rather than to a
 * shape's own declarations. The one place that knows, so a type declaring an
 * extra under a name the engine owns is refused where its table is built
 * (extraStyleTable) rather than registering an entry the boundary would never
 * reach.
 *
 * @param property - The property name, as a declaration or a menu part spells it
 */
export const isSystemStyleName = (property: string): boolean =>
	intentMapperOf(property) !== undefined;

/**
 * The one reading of a property name and a string value — the form the DOM
 * carries them in (`set:fill:#f00`, `slider:strokeWidth`, a color typed into a
 * picker) — into the intent they state.
 *
 * Both surfaces that write a style end at `applyStyleIntent`, and this is what
 * either of them calls when all it holds is a name and a string: the gesture
 * route for a `set:` / `slider:` part (applyStylePropertyPart), and a widget of
 * the React route that reads its value off the DOM. A row that knows its
 * property statically states the intent outright instead and never comes here.
 *
 * A name the engine's own vocabulary does not own is a shape's own declaration,
 * and is passed on under that very name for the types' tables to answer
 * (extraStyleTable); a name nobody declares therefore applies to nothing
 * (fail-closed).
 *
 * @param property - The property name, as the menus' parts spell it; a name with dots in it is a shape's own write path (`label.fill`)
 * @param value - The value as a string, read into the intent's own type (INTENT_BY_PROPERTY) or left as it stands for the shape's own entry to read
 * @returns The intent to apply, or undefined for a value nothing can be made of (a string no number parses from) — which is the caller's cue to apply nothing
 * @throws For a `textVerticalBasis` value that is neither basis — the one property whose value has always been checked
 */
export const styleIntentOf = (
	property: string,
	value: string,
): StyleIntent | ExtraStyleIntent | undefined => {
	const toIntent = intentMapperOf(property);
	return toIntent === undefined ? { kind: property, value } : toIntent(value);
};
