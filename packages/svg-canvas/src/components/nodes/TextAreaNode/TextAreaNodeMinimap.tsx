import type React from "react";
import { memo } from "react";

import type { TextAreaNodeProps } from "../../../types/props/nodes/TextAreaNodeProps";
import { negativeToZero } from "../../../utils/math/common/negativeToZero";

/**
 * TextAreaNode minimap component - lightweight version without outlines, controls, and labels.
 */
const TextAreaNodeMinimapComponent: React.FC<TextAreaNodeProps> = (props) => {
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
				{/* Icon background (blue color) */}
				<rect
					x={-width / 2 + 8}
					y={-16}
					width={32}
					height={32}
					fill="#000000"
					rx="4"
				/>

				{/* TextArea icon representation (simplified white lines) */}
			</g>

			{/* Input area */}
			<g transform={`translate(0, ${-10})`}>
				<rect
					x={-width / 2 + 16}
					y={-height / 2 + 60}
					width={negativeToZero(width - 32)}
					height={negativeToZero(height - 120)}
					fill="#fafafa"
					stroke="#d9d9d9"
					strokeWidth="1"
					rx="2"
				/>
			</g>

			{/* Send button */}
			<g transform={`translate(${width / 2 - 40}, ${height / 2 - 20})`}>
				<rect x={-20} y={-8} width={40} height={16} fill="#000000" rx="8" />
			</g>
		</g>
	);
};

export const TextAreaNodeMinimap = memo(TextAreaNodeMinimapComponent);
