import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Update strategy for one styleable property (registered in stylePropertyRegistry).
 * Kept to a single method on purpose: standard properties should be declared via
 * FeatureGatedStyleProperty / ExtraStyleProperties, not by implementing this directly.
 */
export interface StylePropertyHandler {
	/** Applies the update to the current selection. Returns `state` as-is (same reference) when nothing applies. */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState;
}
