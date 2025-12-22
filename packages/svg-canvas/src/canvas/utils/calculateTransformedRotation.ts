import type { TransformativeState } from "../../types/state/core/TransformativeState";
import { isRotateDisabled } from "../../utils/shapes/group/isRotateDisabled";

/**
 * Calculates the transformed rotation of an item within a group transformation.
 *
 * If the item has rotation disabled (either directly or because it's a group
 * containing items with rotation disabled), the original rotation is preserved.
 * Otherwise, the rotation difference from the transformation is applied.
 *
 * @param initialItem - The transformative item before transformation
 * @param startRotation - The group's rotation before transformation
 * @param endRotation - The group's rotation after transformation
 * @returns The new rotation value for the item
 */
export const calculateTransformedRotation = (
	initialItem: TransformativeState,
	startRotation: number,
	endRotation: number,
): number => {
	// If rotation is disabled, preserve the original rotation
	if (isRotateDisabled(initialItem)) {
		return initialItem.rotation;
	}

	// Calculate and apply the rotation difference
	const rotationDiff = endRotation - startRotation;
	return initialItem.rotation + rotationDiff;
};
