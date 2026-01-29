import type { Frame, FrameKeyPoints } from "@workspace/geometry";

/**
 * Frame with optional cached key points.
 * KeyPoints can be pre-calculated and cached for performance optimization.
 */
export type FrameWithKeyPoints = Frame & {
	/** Cached key points for performance optimization */
	keyPoints?: FrameKeyPoints;
};

/**
 * Type guard to check if an object has keyPoints property.
 * This is a simple runtime check to see if keyPoints cache exists.
 *
 * @param obj - The object to check
 * @returns True if the object has a keyPoints property that is not null/undefined
 */
export const hasFrameKeyPoints = (
	obj: unknown,
): obj is { keyPoints: FrameKeyPoints } => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"keyPoints" in obj &&
		obj.keyPoints !== undefined &&
		obj.keyPoints !== null
	);
};
