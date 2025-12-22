import type { Frame } from "../../core/Frame";

/**
 * Interface for diagram elements that can be resized, rotated, and repositioned.
 * Extends the Frame interface with additional transformation properties.
 */
export type TransformativeData = Frame & {
	keepProportion: boolean;
	rotateEnabled: boolean;
	inversionEnabled: boolean;
};
