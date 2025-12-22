import type React from "react";
import { memo } from "react";

import type { HtmlGenNodeProps } from "../../../types/props/nodes/HtmlGenNodeProps";
import { negativeToZero } from "../../../utils/math/common/negativeToZero";

/**
 * HtmlGenNode minimap component - lightweight version without outlines, controls, and labels.
 */
const HtmlGenNodeMinimapComponent: React.FC<HtmlGenNodeProps> = (props) => {
	const { x, y, width, height, rotation, scaleX, scaleY } = props;

	return (
		<g
			transform={`translate(${x}, ${y}) scale(${scaleX}, ${scaleY}) rotate(${rotation})`}
		>
			{/* Outer frame */}
			<rect
				x={-width / 2}
				y={-height / 2}
				width={negativeToZero(width)}
				height={negativeToZero(height)}
				fill="white"
				stroke="#E5E6EB"
				strokeWidth="1"
				rx="6"
			/>

			{/* Button area */}
			<g transform={`translate(0, 0)`}>
				{/* Button background */}
				<rect
					x={-60}
					y={-16}
					width={120}
					height={32}
					fill="#FF6B35"
					stroke="#FF4500"
					strokeWidth="1"
					rx="4"
				/>
				{/* Button text */}
				<text
					x="0"
					y="0"
					fontSize="10"
					fill="#FFFFFF"
					textAnchor="middle"
					dominantBaseline="middle"
					fontWeight="bold"
				>
					Generate HTML
				</text>
			</g>
		</g>
	);
};

export const HtmlGenNodeMinimap = memo(HtmlGenNodeMinimapComponent);