import { isBoolean, isNumber } from "@workspace/basic-validators";
import { isTransform, type Transform } from "@workspace/geometry";

/**
 * Transform properties for objects in State layer.
 * Extends geometry's Transform with additional UI properties.
 */
export type TransformState = Transform & {
	/** Lock aspect ratio during resize. Default: false */
	lockAspectRatio?: boolean;
	/** Minimum width during transformation. Optional. */
	minWidth?: number;
	/** Minimum height during transformation. Optional. */
	minHeight?: number;
};

/**
 * Type guard to check if an object is TransformState.
 *
 * @param obj - The object to check
 * @returns True if the object is TransformState, false otherwise
 */
export const isTransformState = (obj: unknown): obj is TransformState => {
	if (!isTransform(obj)) {
		return false;
	}
	if (
		"lockAspectRatio" in obj &&
		obj.lockAspectRatio !== undefined &&
		!isBoolean(obj.lockAspectRatio)
	) {
		return false;
	}
	// minWidth / minHeight are optional numbers on the type. Keep the guard in sync
	// with the declared shape so a clipboard-pasted `minWidth: "…"` cannot slip
	// through this boundary as an ostensibly valid TransformState.
	if (
		"minWidth" in obj &&
		obj.minWidth !== undefined &&
		!isNumber(obj.minWidth)
	) {
		return false;
	}
	if (
		"minHeight" in obj &&
		obj.minHeight !== undefined &&
		!isNumber(obj.minHeight)
	) {
		return false;
	}
	return true;
};
