import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { ExtraStyleProperty } from "./ExtraStyleProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { CanvasControllerState } from "../CanvasTypes";
import { applyStyleIntent } from "../style/applyStyleIntent";
import type { StyleIntentRegistries } from "../style/ObjectStyleRegistry";
import type { StyleIntent } from "../style/StyleIntent";

/**
 * The property names the style tables answer for, each paired with the intent the
 * menus' string value makes (IntentStyleName lists the same names, subtracting
 * them from the handlers this registry demands). Grows as the remaining
 * properties move over, and goes with the registry once the last one has.
 */
const INTENT_BY_PROPERTY: Record<string, (value: string) => StyleIntent> = {
	fill: (value) => ({ kind: "fill", color: value }),
	fontColor: (value) => ({ kind: "fontColor", color: value }),
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
		const intent = INTENT_BY_PROPERTY[property]?.(value);
		if (intent !== undefined) {
			return applyStyleIntent(state, intent, registries);
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
