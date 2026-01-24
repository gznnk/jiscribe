import { isTransform, type Transform } from "@workspace/geometry";

import { isBoolean } from "../../../../../basic-validators/src";

/**
 * Transform properties for objects in State layer.
 * Extends geometry's Transform with additional UI properties.
 */
export type TransformState = Transform & {
	/** Lock aspect ratio during resize. Default: false */
	lockAspectRatio?: boolean;
};

/**
 * Type guard to check if an object is TransformState.
 *
 * @param obj - The object to check
 * @returns True if the object is TransformState, false otherwise
 */
export const isTransformState = (obj: unknown): obj is TransformState => {
	return (
		isTransform(obj) &&
		(!("lockAspectRatio" in obj) || isBoolean(obj.lockAspectRatio))
	);
};
