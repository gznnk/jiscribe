import type React from "react";
import { memo } from "react";

import {
	createEndPointArrowHead,
	createStartPointArrowHead,
} from "./PathUtils";
import type { PathProps } from "../../../types/props/shapes/PathProps";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";

/**
 * Path minimap component - lightweight version without outlines, controls, and labels.
 */
const PathMinimapComponent: React.FC<PathProps> = ({
	id,
	items,
	stroke = "black",
	strokeWidth,
	pathType,
	startArrowHead = "None",
	endArrowHead = "None",
}) => {
	const points = items as PathPointState[];
	// Create the path d attribute directly from items
	let d = "";
	if (items && points.length > 0) {
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			d += `${i === 0 ? "M" : "L"} ${point.x} ${point.y} `;
		}
	}

	// Create path data for arrow heads
	const pathData = {
		items,
		stroke,
		strokeWidth,
		pathType,
		startArrowHead,
		endArrowHead,
	};

	// Create arrow head elements
	const startArrowHeadElement = createStartPointArrowHead(pathData);
	const endArrowHeadElement = createEndPointArrowHead(pathData);

	return (
		<>
			<path
				id={id}
				d={d}
				fill="none"
				stroke={stroke}
				strokeWidth={strokeWidth}
				pointerEvents="none"
			/>
			{/* Arrow heads */}
			{startArrowHeadElement}
			{endArrowHeadElement}
		</>
	);
};

export const PathMinimap = memo(PathMinimapComponent);
