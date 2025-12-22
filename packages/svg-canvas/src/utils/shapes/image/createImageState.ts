import { ImageDefaultState } from "../../../constants/state/shapes/ImageDefaultState";
import type { ImageState } from "../../../types/state/shapes/ImageState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Creates image state with the specified properties.
 *
 * @param params - Image parameters including position, size and image data
 * @returns The created image state object
 */
export const createImageState = ({
	x,
	y,
	width = 100,
	height = 100,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	keepProportion = true,
	base64Data = "",
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	radius?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	keepProportion?: boolean;
	base64Data?: string;
}): ImageState => {
	return {
		...ImageDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		keepProportion,
		base64Data,
	} as ImageState;
};
