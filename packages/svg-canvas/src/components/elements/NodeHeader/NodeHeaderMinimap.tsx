import type React from "react";
import { memo } from "react";

import type { NodeHeaderProps } from "../../../types/props/elements/NodeHeaderProps";

/**
 * NodeHeader minimap component (simplified version for minimap)
 */
const NodeHeaderMinimapComponent: React.FC<NodeHeaderProps> = ({
	x,
	y,
	width,
	height = 30,
	text,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	iconBackgroundColor,
}) => {
	// Constants for layout (simplified for minimap)
	const iconSize = height * 0.6; // Smaller icon for minimap
	const iconX = x - width / 2 + iconSize / 2 + 4; // Reduced padding
	const textX = x - width / 2 + iconSize + 8; // Reduced padding

	return (
		<g pointerEvents="none">
			{/* Icon background (rounded rectangle) */}
			<rect
				x={iconX - iconSize / 2}
				y={y - iconSize / 2}
				width={iconSize}
				height={iconSize}
				rx={iconSize * 0.15}
				ry={iconSize * 0.15}
				fill={iconBackgroundColor}
			/>

			{/* Simplified icon representation (just a circle for minimap) */}
			<circle
				cx={iconX}
				cy={y}
				r={iconSize * 0.2}
				fill={fontColor}
				opacity={0.6}
			/>

			{/* Text */}
			<text
				x={textX}
				y={y}
				fill={fontColor}
				fontSize={Math.max(fontSize || 12, 8)} // Minimum font size for readability
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				textAnchor="start"
				dominantBaseline="central"
			>
				{text || "NodeHeader"}
			</text>
		</g>
	);
};

export const NodeHeaderMinimap = memo(NodeHeaderMinimapComponent);
