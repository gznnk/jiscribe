import { memo } from "react";

type DelayIconProps = {
	width?: number;
	height?: number;
};

const DelayIconComponent: React.FC<DelayIconProps> = ({
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
				d="M4 6 H14 A6 6 0 0 1 14 18 H4 Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const DelayIcon = memo(DelayIconComponent);
