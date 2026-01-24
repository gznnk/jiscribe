import type { Transform } from "@workspace/geometry";

/**
 * Transform properties for objects in State layer.
 * Extends geometry's Transform with additional UI properties.
 */
export type TransformState = Transform & {
	/** Lock aspect ratio during resize. Default: false */
	lockAspectRatio?: boolean;
};
