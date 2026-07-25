import type { FlipScale } from "./FlipScale";

/**
 * Defines transformation properties for shapes.
 * Used to apply rotation and scaling to geometric primitives.
 */
export type Transform = {
	/** Rotation in degrees */
	rotation: number;
	/** X 軸の反転フラグ（±1）。寸法は width/height が持つ */
	scaleX: FlipScale;
	/** Y 軸の反転フラグ（±1）。寸法は width/height が持つ */
	scaleY: FlipScale;
};
