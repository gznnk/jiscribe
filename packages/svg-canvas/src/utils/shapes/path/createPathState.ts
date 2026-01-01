import type { Point } from "@workspace/geometry";

import { PathDefaultState } from "../../../constants/state/shapes/PathDefaultState";
import type { ArrowHeadType } from "../../../types/core/ArrowHeadType";
import type { PathType } from "../../../types/core/PathType";
import type { StrokeDashType } from "../../../types/core/StrokeDashType";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
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
	points,
}: {
	x?: number;
	y?: number;
	stroke?: string;
	strokeWidth?: number;
	strokeDashType?: StrokeDashType;
	pathType?: PathType;
	startArrowHead?: ArrowHeadType;
	endArrowHead?: ArrowHeadType;
	points?: Point[];
}): PathState => {
	// If points are provided, use them; otherwise create default points
	const pathPoints: PathPointState[] = points
		? points.map(
				(point) =>
					({
						id: newId(),
						type: "PathPoint",
						geometryType: "point",
						x: point.x,
						y: point.y,
					}) as PathPointState,
			)
		: [
				{
					id: newId(),
					type: "PathPoint",
					geometryType: "point",
					x: x - 50,
					y: y - 50,
				} as PathPointState,
				{
					id: newId(),
					type: "PathPoint",
					geometryType: "point",
					x: x + 50,
					y: y + 50,
				} as PathPointState,
			];

	return {
		...PathDefaultState,
		id: newId(),
		stroke,
		strokeWidth,
		strokeDashType,
		pathType,
		startArrowHead,
		endArrowHead,
		points: pathPoints,
	};
};
