import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Update strategy for one styleable property. The engine's own style vocabulary
 * is answered by the per-type style tables instead (ObjectStyleRegistry), so the
 * only implementation left is the one that writes a shape's own declarations
 * (ExtraStyleProperty) — which is how a shape adds a property, rather than by
 * implementing this directly.
 */
export interface StylePropertyHandler {
	/** Applies the update to the current selection. Returns `state` as-is (same reference) when nothing applies. */
	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState;
}
