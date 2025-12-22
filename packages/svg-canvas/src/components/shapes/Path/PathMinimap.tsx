import type React from "react";
import { memo } from "react";

import type { PathProps } from "../../../types/props/shapes/PathProps";

/**
 * Path minimap component - lightweight version without outlines, controls, and labels.
 */
const PathMinimapComponent: React.FC<PathProps> = ({
	id,
	items,
	stroke,
	strokeWidth,
}) => {
	// Create the path d attribute directly from items
	let d = "";
	if (items && items.length > 0) {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			d += `${i === 0 ? "M" : "L"} ${item.x} ${item.y} `;
		}
	}

	return (
		<path
			id={id}
			d={d}
			fill="none"
			stroke={stroke}
			strokeWidth={strokeWidth}
			pointerEvents="none"
		/>
	);
};

export const PathMinimap = memo(PathMinimapComponent);
