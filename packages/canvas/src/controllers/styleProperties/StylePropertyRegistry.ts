import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";

import { ExtraStyleProperty } from "./ExtraStyleProperty";
import { coerceStyleValue } from "./SelectionStyleProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { CanvasControllerState } from "../CanvasTypes";
import { applyStyleIntent } from "../style/applyStyleIntent";
import type { StyleIntentRegistries } from "../style/ObjectStyleRegistry";
import type { StyleIntent } from "../style/StyleIntent";

/** The number the string carries, or undefined when it does not parse — the handlers' own rule. */
const toStyleNumber = (value: string): number | undefined => {
	const coerced = coerceStyleValue("number", value);
	return typeof coerced === "number" ? coerced : undefined;
};

/**
 * The property names the style tables answer for, each paired with the intent the
 * menus' string value makes (IntentStyleName lists the same names, subtracting
 * them from the handlers this registry demands). Grows as the remaining
 * properties move over, and goes with the registry once the last one has.
 *
 * A mapper returning undefined is a value nothing can be made of, which applies
 * nothing — the same answer the handlers' coercion gives.
 *
 * The transport is a string either way, so the dash, the two arrowheads and the
 * two alignments are cast to their unions here rather than validated: nothing
 * checked them on the handler side either, the values coming from the menus' own
 * parts.
 */
const INTENT_BY_PROPERTY: Record<
	string,
	(value: string) => StyleIntent | undefined
> = {
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
};

/**
 * Per-canvas registry and dispatch entry for styleable property updates.
 * Holds property → handler registrations (system properties, wired at bundle
 * creation) plus per-type ExtraStyleProperties declarations (wired per object
 * definition). Properties with neither registration apply to nothing (fail-closed).
 *
 * Being replaced by the per-type style tables (ObjectStyleRegistry): the
 * properties already moved over are forwarded by `apply` rather than handled
 * here, and this class goes once the last of them has.
 */
export class StylePropertyRegistry {
	private readonly handlers = new Map<string, StylePropertyHandler>();
	private readonly extrasByType = new Map<
		ObjectType,
		Record<string, ExtraStylePropertyDescriptor>
	>();
	private readonly extraFallback: StylePropertyHandler = new ExtraStyleProperty(
		this,
	);

	registerHandler(property: string, handler: StylePropertyHandler): void {
		this.handlers.set(property, handler);
	}

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
	 * Applies a property update to the selection via the resolved handler.
	 *
	 * @param state - The state to write into; its selection decides who is reached
	 * @param property - The property name, as the menus' parts spell it
	 * @param value - The value as a string, coerced by the handler to its declared type
	 * @param registries - The canvas's style tables and shape-style defaults, for the properties already moved to the style intents
	 */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
		registries: StyleIntentRegistries,
	): CanvasControllerState {
		// Temporary: the properties moved to the style tables are answered there
		// (ObjectStyleRegistry) rather than by a handler. This fork goes away with
		// the whole registry, once the last property has moved over.
		const toIntent = INTENT_BY_PROPERTY[property];
		if (toIntent !== undefined) {
			const intent = toIntent(value);
			return intent === undefined
				? state
				: applyStyleIntent(state, intent, registries);
		}
		const handler = this.handlers.get(property) ?? this.extraFallback;
		return handler.apply(state, property, value);
	}

	/** Clears only the per-type declarations (handlers are canvas-wide, not per-object). */
	clearExtras(): void {
		this.extrasByType.clear();
	}
}

export const createStylePropertyRegistry = (): StylePropertyRegistry =>
	new StylePropertyRegistry();
