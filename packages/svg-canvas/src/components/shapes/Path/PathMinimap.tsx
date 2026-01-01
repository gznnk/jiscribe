import type React from "react";
import { memo } from "react";

import {
	createEndPointArrowHead,
	createStartPointArrowHead,
} from "./PathUtils";
import type { PathProps } from "../../../types/props/shapes/PathProps";

/**
 * Path minimap component - lightweight version without outlines, controls, and labels.
 */
const PathMinimapComponent: React.FC<PathProps> = ({
	id,
	points,
	stroke = "black",
	strokeWidth,
	pathType,
	startArrowHead = "None",
	endArrowHead = "None",
}) => {
	// Create the path d attribute directly from points
	let d = "";
	if (points && points.length > 0) {
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			d += `${i === 0 ? "M" : "L"} ${point.x} ${point.y} `;
		}
	}

	// Create path data for arrow heads
	const pathData = {
		points,
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
