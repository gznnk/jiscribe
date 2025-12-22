import { PathDefaultState } from "../../../constants/state/shapes/PathDefaultState";
import type { ArrowHeadType } from "../../../types/core/ArrowHeadType";
import type { PathType } from "../../../types/core/PathType";
import type { Point } from "../../../types/core/Point";
import type { StrokeDashType } from "../../../types/core/StrokeDashType";
import type { PathPointData } from "../../../types/data/shapes/PathPointData";
import type { PathState } from "../../../types/state/shapes/PathState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Creates path state with the specified properties.
 *
 * @param params - Path parameters including position, styling, path type, arrows, and optional points
 * @returns The created path state object
 */
export const createPathState = ({
	x = 0,
	y = 0,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType = "solid",
	pathType = "Polyline",
	startArrowHead = "None",
	endArrowHead = "None",
	items,
}: {
	x?: number;
	y?: number;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: StrokeDashType;
	pathType?: PathType;
	startArrowHead?: ArrowHeadType;
	endArrowHead?: ArrowHeadType;
	items?: Point[];
}): PathState => {
	// If items are provided, use them; otherwise create default points
	const pathPoints: PathPointData[] = items
		? items.map(
				(point) =>
					({
						id: newId(),
						type: "PathPoint",
						x: point.x,
						y: point.y,
					}) as PathPointData,
			)
		: [
				{
					id: newId(),
					type: "PathPoint",
					x: x - 50,
					y: y - 50,
				} as PathPointData,
				{
					id: newId(),
					type: "PathPoint",
					x: x + 50,
					y: y + 50,
				} as PathPointData,
			];

	return {
		...PathDefaultState,
		id: newId(),
		x,
		y,
		stroke,
		strokeWidth,
		strokeDashType,
		pathType,
		startArrowHead,
		endArrowHead,
		items: pathPoints,
	};
};
