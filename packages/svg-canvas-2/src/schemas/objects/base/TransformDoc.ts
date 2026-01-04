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
};
