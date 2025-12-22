import { SvgDefaultState } from "../../../constants/state/shapes/SvgDefaultState";
import type { SvgState } from "../../../types/state/shapes/SvgState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Creates svg state with the specified properties.
 */
export const createSvgState = ({
	x,
	y,
	svgText,
	width = 100,
	height = 100,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	keepProportion = false,
}: {
	x: number;
	y: number;
	svgText: string;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	keepProportion?: boolean;
}): SvgState => {
	return {
		...SvgDefaultState,
		id: newId(),
		x,
		y,
		svgText,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		keepProportion,
		initialWidth: width,
		initialHeight: height,
	} as SvgState;
};
