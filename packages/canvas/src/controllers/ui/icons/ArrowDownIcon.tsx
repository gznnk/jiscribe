import { memo } from "react";

type ArrowDownIconProps = {
	width?: number;
	height?: number;
};

const ArrowDownIconComponent: React.FC<ArrowDownIconProps> = ({
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
				x1="12"
				y1="5"
				x2="12"
				y2="19"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			<polyline
				points="6,13 12,19 18,13"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ArrowDownIcon = memo(ArrowDownIconComponent);
