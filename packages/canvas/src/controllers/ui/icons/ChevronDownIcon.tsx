import { memo } from "react";

type ChevronDownIconProps = {
	width?: number;
	height?: number;
};

const ChevronDownIconComponent: React.FC<ChevronDownIconProps> = ({
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
			<polyline
				points="5,9 12,16 19,9"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const ChevronDownIcon = memo(ChevronDownIconComponent);
