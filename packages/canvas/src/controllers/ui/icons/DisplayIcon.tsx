import { memo } from "react";

type DisplayIconProps = {
	width?: number;
	height?: number;
};

const DisplayIconComponent: React.FC<DisplayIconProps> = ({
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
			<path
				d="M2 12 L6 5 H17 A3 7 0 0 1 17 19 H6 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const DisplayIcon = memo(DisplayIconComponent);
