import { memo } from "react";

type StadiumIconProps = {
	width?: number;
	height?: number;
};

const StadiumIconComponent: React.FC<StadiumIconProps> = ({
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
				y="7"
				width="18"
				height="10"
				rx="5"
				ry="5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const StadiumIcon = memo(StadiumIconComponent);
