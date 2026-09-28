import type { CanvasControllerState } from "../CanvasTypes";
import type { ObjectPartRegistry } from "../selection/ObjectPartRegistry";

/**
 * Update strategy for one styleable property (registered in stylePropertyRegistry).
 * Kept to a single method on purpose: standard properties should be declared via
 * FeatureGatedStyleProperty / ExtraStyleProperties, not by implementing this directly.
 */
export interface StylePropertyHandler {
	/**
	 * Applies the update to the current selection. Returns `state` as-is (same
	 * reference) when nothing applies.
	 *
	 * @param state - The state to write into
	 * @param property - The property name, dot-separated for a nested one ("label.fill")
	 * @param value - The menu's raw string, coerced to the declared type by the handler
	 * @param objectPart - Per-canvas ObjectPartRegistry, which decides whether the
	 *   selection addresses parts of one object rather than the objects as wholes;
	 *   a handler storing nothing per part may leave the parameter out
	 */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
		objectPart: ObjectPartRegistry,
	): CanvasControllerState;
}
