import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Frame } from "../types/Frame";
import type { FrameFeaturePoints } from "../types/FrameFeaturePoints";

/**
 * Calculates the feature points (vertices and edge centers) of a frame.
 *
 * @param frame - The frame geometry (center position, dimensions, rotation, scale)
 * @returns The coordinates of the frame's feature points
 */
export const calcFrameFeaturePoints = (frame: Frame): FrameFeaturePoints => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// No rotation - optimized path when rotation is 0
	if (rotation === 0) {
		const scaledHalfWidth = scaleX * halfWidth;
		const scaledHalfHeight = scaleY * halfHeight;

		return {
			topLeft: { x: cx - scaledHalfWidth, y: cy - scaledHalfHeight },
			topCenter: { x: cx, y: cy - scaledHalfHeight },
			topRight: { x: cx + scaledHalfWidth, y: cy - scaledHalfHeight },
			rightCenter: { x: cx + scaledHalfWidth, y: cy },
			bottomRight: { x: cx + scaledHalfWidth, y: cy + scaledHalfHeight },
			bottomCenter: { x: cx, y: cy + scaledHalfHeight },
			bottomLeft: { x: cx - scaledHalfWidth, y: cy + scaledHalfHeight },
			leftCenter: { x: cx - scaledHalfWidth, y: cy },
		};
	}

	// With rotation - calculate once and reuse
	const radians = degreesToRadians(rotation);

	return {
		topLeft: calcAffineTransformedPoint(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		topCenter: calcAffineTransformedPoint(
			0,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		topRight: calcAffineTransformedPoint(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		rightCenter: calcAffineTransformedPoint(
			halfWidth,
			0,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		bottomRight: calcAffineTransformedPoint(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		bottomCenter: calcAffineTransformedPoint(
			0,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		bottomLeft: calcAffineTransformedPoint(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
		leftCenter: calcAffineTransformedPoint(
			-halfWidth,
			0,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	};
};
