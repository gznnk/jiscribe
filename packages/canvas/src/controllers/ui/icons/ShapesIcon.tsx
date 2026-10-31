import { memo } from "react";

type ShapesIconProps = {
	width?: number;
	height?: number;
};

/**
 * Three shapes and a plus: more shapes than a bar pins, the icon of the
 * stencil bar's "Other shapes" button.
 */
const ShapesIconComponent: React.FC<ShapesIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="4"
				y="4"
				width="7"
				height="7"
				rx="1"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<circle
				cx="17.5"
				cy="7.5"
				r="3.5"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path
				d="M7.5 13.5 11 20H4l3.5-6.5Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M17.5 14v7M14 17.5h7"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ShapesIcon = memo(ShapesIconComponent);
