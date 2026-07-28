import { memo } from "react";

type ClassIconProps = {
	width?: number;
	height?: number;
};

/** Three-compartment box: the title band over attributes over operations. */
const ClassIconComponent: React.FC<ClassIconProps> = ({
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
				y="4"
				width="18"
				height="16"
				rx="1"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<line
				x1="3"
				y1="9"
				x2="21"
				y2="9"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<line
				x1="6"
				y1="12"
				x2="18"
				y2="12"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<line
				x1="3"
				y1="15"
				x2="21"
				y2="15"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<line
				x1="6"
				y1="18"
				x2="14"
				y2="18"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
		</svg>
	);
};

export const ClassIcon = memo(ClassIconComponent);
