import type React from "react";
import { memo } from "react";

import type { LLMNodeProps } from "../../../types/props/nodes/LLMNodeProps";
import { negativeToZero } from "../../../utils/math/common/negativeToZero";

/**
 * LLMNode minimap component - lightweight version without outlines, controls, and labels.
 */
const LLMNodeMinimapComponent: React.FC<LLMNodeProps> = (props) => {
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

			{/* Header area with icon */}
			<g transform={`translate(0, ${-height / 2 + 20})`}>
				{/* Icon background (purple color for LLM) */}
				<rect
					x={-width / 2 + 8}
					y={-16}
					width={32}
					height={32}
					fill="#8B5CF6"
					rx="4"
				/>
			</g>

			{/* Input area */}
			<g transform={`translate(0, ${-5})`}>
				<rect
					x={-width / 2 + 16}
					y={-height / 2 + 60}
					width={negativeToZero(width - 32)}
					height={negativeToZero(height - 80)}
					fill="#fafafa"
					stroke="#d9d9d9"
					strokeWidth="1"
					rx="2"
				/>
			</g>
		</g>
	);
};

export const LLMNodeMinimap = memo(LLMNodeMinimapComponent);
