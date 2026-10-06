import type { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { isTextVerticalBasis } from "@jiscribe/doc/model/objects/types/text/TextVerticalBasis";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

import { ExtraStyleProperty } from "./ExtraStyleProperty";
import { coerceStyleValue } from "./SelectionStyleProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { CanvasControllerState } from "../CanvasTypes";
import { applyStyleIntent } from "../style/applyStyleIntent";
import type { StyleIntentRegistries } from "../style/ObjectStyleRegistry";
import type { StyleIntent } from "../style/StyleIntent";

/**
 * Every name a style property may carry that is not a shape's own declaration:
 * the fields of the style groups the doc declares, plus the three that no group
 * owns — the text content, and the two switches below.
 *
 * `INTENT_BY_PROPERTY` is checked against it, so a field added to a group fails
 * to compile until it is given a mapper, and a name no group owns is refused.
 *
 * Of the transform group only `lockAspectRatio` is written this way: rotation and
 * the flips are moved through their own gestures and ops, never through a style
 * property, so listing them would demand mappers that nothing would reach.
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

/** The number the string carries, or undefined when it does not parse — the handlers' own rule. */
const toStyleNumber = (value: string): number | undefined => {
	const coerced = coerceStyleValue("number", value);
	return typeof coerced === "number" ? coerced : undefined;
};

/**
 * The property names the style tables answer for, each paired with the intent the
 * menus' string value makes. Exhaustive over SystemStyleName, which is what keeps
 * every style field on exactly one route; it goes with this registry once the
 * shapes' ExtraStyleProperties have moved too.
 *
 * A mapper returning undefined is a value nothing can be made of, which applies
 * nothing — the same answer the handlers' coercion gave.
 *
 * The transport is a string either way, so the dash, the two arrowheads and the
 * two alignments are cast to their unions here rather than validated: nothing
 * checked them on the handler side either, the values coming from the menus' own
 * parts. The basis is the exception, having always been checked.
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
 * The mapper for one property name, or undefined for a name the style tables do
 * not answer for (a shape's own ExtraStyleProperty). Looked up through a cast
 * because the record is exhaustive by type rather than by index signature, which
 * is what makes a new style field a compile error.
 *
 * @param property - The property name, as the menus' parts spell it
 */
const intentMapperOf = (property: string): StyleIntentMapper | undefined =>
	(INTENT_BY_PROPERTY as Record<string, StyleIntentMapper | undefined>)[
		property
	];

/**
 * Per-canvas registry and dispatch entry for styleable property updates.
 * Holds the per-type ExtraStyleProperties declarations (wired per object
 * definition); a property with no declaration applies to nothing (fail-closed).
 *
 * Being replaced by the per-type style tables (ObjectStyleRegistry): every
 * property of the engine's own vocabulary is forwarded by `apply` rather than
 * handled here, and this class goes once the shapes' own declarations have moved
 * too.
 */
export class StylePropertyRegistry {
	private readonly extrasByType = new Map<
		ObjectType,
		Record<string, ExtraStylePropertyDescriptor>
	>();
	private readonly extraStyleProperty: StylePropertyHandler =
		new ExtraStyleProperty(this);

	registerExtras(
		type: ObjectType,
		properties: Record<string, ExtraStylePropertyDescriptor>,
	): void {
		this.extrasByType.set(type, properties);
	}

	getExtra(
		type: ObjectType,
		property: string,
	): ExtraStylePropertyDescriptor | undefined {
		return this.extrasByType.get(type)?.[property];
	}

	/**
	 * Applies a property update to the selection: through the style tables for the
	 * engine's own vocabulary, through the shape's own declaration otherwise.
	 *
	 * @param state - The state to write into; its selection decides who is reached
	 * @param property - The property name, as the menus' parts spell it
	 * @param value - The value as a string, read into the intent's own type (INTENT_BY_PROPERTY) or coerced to the declared one
	 * @param registries - The canvas's style tables and the defaults their entries resolve through
	 */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
		registries: StyleIntentRegistries,
	): CanvasControllerState {
		// Temporary: the style vocabulary is answered by the tables
		// (ObjectStyleRegistry) rather than by a handler. This fork goes away with
		// the whole registry, once the shapes' own properties have moved over.
		//
		// The lock of a multi-selection is the one intent that lands on the
		// selection box rather than on an object: it belongs to the transient group
		// drawn around the selection (`createMultiSelectGroup`) and no member of it
		// carries the flag. Session state rather than a document field, so no
		// StyleEntry can express it; it moves with this fork to the UI-boundary
		// action that replaces the registry.
		const { multiSelectGroup } = state;
		if (
			property === "lockAspectRatio" &&
			multiSelectGroup &&
			state.selection.objectIds.length > 0
		) {
			return {
				...state,
				multiSelectGroup: {
					...multiSelectGroup,
					lockAspectRatio: value === "true",
				},
			};
		}
		const toIntent = intentMapperOf(property);
		if (toIntent !== undefined) {
			const intent = toIntent(value);
			return intent === undefined
				? state
				: applyStyleIntent(state, intent, registries);
		}
		return this.extraStyleProperty.apply(state, property, value);
	}

	/** Clears the per-type declarations. */
	clearExtras(): void {
		this.extrasByType.clear();
	}
}

export const createStylePropertyRegistry = (): StylePropertyRegistry =>
	new StylePropertyRegistry();
