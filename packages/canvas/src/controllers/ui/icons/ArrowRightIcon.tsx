import { memo } from "react";

type ArrowRightIconProps = {
	width?: number;
	height?: number;
};

const ArrowRightIconComponent: React.FC<ArrowRightIconProps> = ({
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
			<line
				x1="5"
				y1="12"
				x2="19"
				y2="12"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			<polyline
				points="13,6 19,12 13,18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ArrowRightIcon = memo(ArrowRightIconComponent);
