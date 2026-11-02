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
				x="2"
				y="2"
				width="8"
				height="8"
				rx="1.5"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<circle cx="18" cy="6" r="4" stroke="currentColor" strokeWidth="2" />
			<path
				d="M6 14 10 22H2l4-8Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M18 14v8M14 18h8"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ShapesIcon = memo(ShapesIconComponent);
