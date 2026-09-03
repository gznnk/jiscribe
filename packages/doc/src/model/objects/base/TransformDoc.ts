import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Transformation properties for objects.
 * All properties are optional and default to their identity values.
 */
export type TransformDoc = {
	/** Rotation angle in degrees. Default: 0 */
	rotation?: number;
	/** Horizontal flip. Default: false */
	flipX?: boolean;
	/** Vertical flip. Default: false */
	flipY?: boolean;
	/** Lock aspect ratio during resize. Default: false */
	lockAspectRatio?: boolean;
};

/**
 * Field names owned by TransformDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const TRANSFORM_STYLE_KEYS = exhaustiveKeysOf<TransformDoc>()([
	"rotation",
	"flipX",
	"flipY",
	"lockAspectRatio",
] as const);
