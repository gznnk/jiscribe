import type { TransformativeData } from "../../data/core/TransformativeData";

/**
 * Interface for diagram elements that can be resized, rotated, and repositioned.
 * Extends base data with runtime state that should not be persisted.
 */
export type TransformativeState = TransformativeData & {
	isTransforming: boolean;
	minWidth?: number;
	minHeight?: number;
	/** When true, hides the transform controls for this diagram */
	hideTransformControl?: boolean;
	/** When false, disables transform controls for this diagram */
	transformEnabled?: boolean;
};
