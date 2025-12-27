/**
 * Interface for diagram elements that can be resized, rotated, and repositioned.
 * Extends the Frame interface with additional transformation properties.
 */
export type TransformativeData = {
	rotation: number;
	scaleX: number;
	scaleY: number;
	keepProportion: boolean;
	rotateEnabled: boolean;
	inversionEnabled: boolean;
};
