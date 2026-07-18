import { ExtraStyleProperty } from "./ExtraStyleProperty";
import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { ExtraStylePropertyDescriptor } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Per-canvas registry and dispatch entry for styleable property updates.
 * Holds property → handler registrations (system properties, wired at bundle
 * creation) plus per-type ExtraStyleProperties declarations (wired per object
 * definition). Properties with neither registration apply to nothing (fail-closed).
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

	/** Applies a property update to the selection via the resolved handler. */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState {
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
