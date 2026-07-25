import type { FlipScale } from "./FlipScale";

/** Rotation and axis flips applied to a geometric primitive. */
export type Transform = {
	/** Rotation in degrees. */
	rotation: number;
	/** Horizontal flip. Size is carried by width/height, never by scale. */
	scaleX: FlipScale;
	/** Vertical flip. */
	scaleY: FlipScale;
};
