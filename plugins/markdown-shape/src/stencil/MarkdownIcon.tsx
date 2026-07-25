import type { StencilIconProps } from "@workspace/canvas";
import type React from "react";
import { memo } from "react";

const MarkdownIconComponent: React.FC<StencilIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				rx="2"
				ry="2"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<line
				x1="7"
				y1="8"
				x2="17"
				y2="8"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="7"
				y1="12"
				x2="17"
				y2="12"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="7"
				y1="16"
				x2="13"
				y2="16"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const MarkdownIcon = memo(MarkdownIconComponent);
